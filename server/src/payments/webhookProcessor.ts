import type pg from 'pg';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { newId } from '../security.js';
import type { ProviderWebhookEvent } from '../providers/types.js';
import { payloadHash } from '../providers/sandboxProvider.js';
import { decidePaymentTransition, type PaymentStatus } from './paymentState.js';
import { postSuccessfulPayment } from '../ledger/ledgerService.js';

export type WebhookProcessResult =
  | { outcome: 'PROCESSED' | 'DUPLICATE'; paymentStatus?: PaymentStatus }
  | { outcome: 'PAYLOAD_CONFLICT' | 'UNKNOWN_PAYMENT' | 'INVALID_TRANSITION' };

async function existingReceipt(client: pg.PoolClient, provider: string, eventId: string) {
  return client.query(
    'SELECT * FROM webhook_receipts WHERE provider=$1 AND provider_event_id=$2 FOR UPDATE',
    [provider, eventId],
  );
}

export async function processPaymentWebhook(
  db: Db,
  provider: string,
  event: ProviderWebhookEvent,
  rawBody: Buffer,
): Promise<WebhookProcessResult> {
  const hash = payloadHash(rawBody);
  return transaction(db, async (client) => {
    const paymentResult = await client.query('SELECT * FROM payments WHERE reference=$1 FOR UPDATE', [event.paymentReference]);
    const prior = await existingReceipt(client, provider, event.eventId);
    if (prior.rowCount) {
      const receipt = prior.rows[0];
      if (receipt.payload_hash !== hash) {
        await client.query(
          `UPDATE webhook_receipts SET processing_status='SUSPICIOUS', failure_code='PAYLOAD_MISMATCH' WHERE id=$1`,
          [receipt.id],
        );
        return { outcome: 'PAYLOAD_CONFLICT' };
      }
      return { outcome: 'DUPLICATE' };
    }

    const receiptId = newId('whr');
    const reserved = await client.query(
      `INSERT INTO webhook_receipts
       (id,provider,provider_event_id,event_type,payload_hash,signature_verified,processing_status,payment_reference)
       VALUES($1,$2,$3,$4,$5,true,'RECEIVED',$6)
       ON CONFLICT(provider,provider_event_id) DO NOTHING RETURNING id`,
      [receiptId, provider, event.eventId, event.eventType, hash, event.paymentReference],
    );
    if (!reserved.rowCount) {
      const winner = await existingReceipt(client, provider, event.eventId);
      const receipt = winner.rows[0];
      if (receipt.payload_hash !== hash) {
        await client.query(
          `UPDATE webhook_receipts SET processing_status='SUSPICIOUS', failure_code='PAYLOAD_MISMATCH' WHERE id=$1`,
          [receipt.id],
        );
        return { outcome: 'PAYLOAD_CONFLICT' };
      }
      return { outcome: 'DUPLICATE' };
    }

    if (!paymentResult.rowCount) {
      await client.query(
        `UPDATE webhook_receipts SET processing_status='FAILED',failure_code='UNKNOWN_PAYMENT',processed_at=now() WHERE id=$1`,
        [receiptId],
      );
      return { outcome: 'UNKNOWN_PAYMENT' };
    }

    const payment = paymentResult.rows[0];
    const decision = decidePaymentTransition(payment.status as PaymentStatus, event.status);
    if (decision === 'REJECT') {
      await client.query(
        `UPDATE webhook_receipts SET processing_status='FAILED',failure_code='INVALID_TRANSITION',processed_at=now() WHERE id=$1`,
        [receiptId],
      );
      return { outcome: 'INVALID_TRANSITION' };
    }

    if (decision === 'APPLY') {
      await client.query('UPDATE payments SET status=$1,updated_at=now() WHERE id=$2', [event.status, payment.id]);
      const attemptUpdate = await client.query(
        `UPDATE payment_attempts SET status=$1,provider_payment_id=$2,updated_at=now()
         WHERE id=(SELECT id FROM payment_attempts WHERE payment_id=$3 ORDER BY created_at DESC LIMIT 1)`,
        [event.status, event.providerPaymentId, payment.id],
      );
      if (!attemptUpdate.rowCount) throw new Error('Payment attempt is missing');
      const ledger = event.status === 'SUCCEEDED'
        ? await postSuccessfulPayment(client, payment, event.eventId)
        : null;
      await client.query(
        `INSERT INTO payment_events(id,payment_id,type,label,detail)
         VALUES($1,$2,'WEBHOOK_RECEIVED','Verified provider status received',$3)`,
        [newId('evt'), payment.id, `${provider}: ${event.status}`],
      );
      if (ledger?.created) {
        await client.query(
          `INSERT INTO payment_events(id,payment_id,type,label,detail) VALUES($1,$2,'LEDGER_RECORDED','Balanced ledger entry posted',$3)`,
          [newId('evt'), payment.id, ledger.entryId],
        );
      }
      await client.query(
        `INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata)
         VALUES($1,NULL,$2,'PAYMENT_STATUS_CHANGED','payment',$3,$4)`,
        [newId('aud'), payment.merchant_id, payment.id, { provider, eventId: event.eventId, from: payment.status, to: event.status, journalEntryId: ledger?.entryId }],
      );
    }

    await client.query(
      `UPDATE webhook_receipts SET processing_status='PROCESSED',processed_at=now() WHERE id=$1`,
      [receiptId],
    );
    return { outcome: decision === 'IDEMPOTENT' ? 'DUPLICATE' : 'PROCESSED', paymentStatus: event.status };
  });
}
