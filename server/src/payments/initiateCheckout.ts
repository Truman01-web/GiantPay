import { createHash } from 'node:crypto';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { newId } from '../security.js';
import type { PaymentProvider, InitiatePaymentInput } from '../providers/types.js';

interface CheckoutInput {
  merchantId: string;
  sourceId: string;
  kind: 'checkout' | 'qr-checkout';
  key: string;
  amountMinor: number;
  currency: string;
  feeMinor: number;
  description: string | null;
  merchantReference?: string | null;
  channel: InitiatePaymentInput['channel'];
  customer: InitiatePaymentInput['customer'];
}

export interface CheckoutResponse { reference: string; checkoutUrl: string | null; status: 'PROCESSING' }

// Commit an intent before any network I/O. Only its creator may submit it.
// A lost response remains PROCESSING and must never create a second charge.
export async function initiateCheckout(db: Db, provider: PaymentProvider, input: CheckoutInput): Promise<CheckoutResponse> {
  const fingerprint = createHash('sha256').update(JSON.stringify([
    input.sourceId, input.amountMinor, input.currency, input.channel,
    input.customer.name ?? null, input.customer.email ?? null, input.customer.phone ?? null,
  ])).digest('hex');
  const reservation = await transaction(db, async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${input.merchantId}:${input.kind}:${input.key}`]);
    const prior = await c.query('SELECT response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation=$2 AND key=$3', [input.merchantId, input.kind, input.key]);
    if (prior.rowCount) {
      const saved = prior.rows[0].response_body;
      if (!saved.fingerprint && input.kind === 'checkout') {
        // Old checkout receipts contain only a reference. Bind them to their
        // persisted payment before upgrading; never retry provider initiation.
        const legacy = (await c.query('SELECT * FROM payments WHERE merchant_id=$1 AND reference=$2 FOR UPDATE', [input.merchantId,saved.reference])).rows[0];
        if (legacy && legacy.payment_link_id === input.sourceId && Number(legacy.gross_minor) === input.amountMinor && legacy.currency === input.currency && legacy.channel === input.channel &&
          ['name','email','phone'].every(field => (legacy.customer?.[field] ?? null) === (input.customer[field as keyof typeof input.customer] ?? null))) {
          saved.fingerprint = fingerprint;
          saved.checkoutUrl = legacy.provider_checkout_url ?? null;
          await c.query('UPDATE idempotency_keys SET response_body=$1 WHERE merchant_id=$2 AND operation=$3 AND key=$4', [saved,input.merchantId,input.kind,input.key]);
        }
      }
      if (saved.fingerprint !== fingerprint) throw Object.assign(new Error('Idempotency key was used for another request.'), { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' });
      return { created: false, id: '', response: { reference: saved.reference as string, checkoutUrl: saved.checkoutUrl as string | null, status: 'PROCESSING' as const } };
    }
    const table = input.kind === 'checkout' ? 'payment_links' : 'scan_to_pay_codes';
    const source = (await c.query(`SELECT * FROM ${table} WHERE id=$1 AND merchant_id=$2 FOR UPDATE`, [input.sourceId,input.merchantId])).rows[0];
    if (!source || source.status !== 'ACTIVE' || (source.expires_at && new Date(source.expires_at).getTime() <= Date.now())) {
      throw Object.assign(new Error('This payment session has expired.'), { code: 'CHECKOUT_EXPIRED' });
    }
    const limit = input.kind === 'checkout' && !source.reusable ? 1 : source.max_successful_payments;
    if (limit != null) {
      const column = input.kind === 'checkout' ? 'payment_link_id' : 'scan_to_pay_code_id';
      const count = await c.query(`SELECT count(*) count FROM payments WHERE ${column}=$1 AND status IN ('PROCESSING','PENDING','SUCCEEDED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED')`, [input.sourceId]);
      if (Number(count.rows[0].count) >= Number(limit)) throw Object.assign(new Error('Payment capacity is reserved.'), { code: 'CHECKOUT_CAPACITY' });
    }
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('Invalid checkout amount');
    const id = newId('pay'), reference = newId('GP');
    const response: CheckoutResponse = { reference, checkoutUrl: null, status: 'PROCESSING' };
    await c.query(`INSERT INTO payments(id,merchant_id,payment_link_id,scan_to_pay_code_id,reference,merchant_reference,description,status,channel,provider_name,gross_minor,fee_minor,currency,customer,provider_submitted_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,'PROCESSING',$8,$9,$10,$11,$12,$13,now())`, [id,input.merchantId,input.kind === 'checkout' ? input.sourceId : null,input.kind === 'qr-checkout' ? input.sourceId : null,reference,input.merchantReference ?? null,input.description,input.channel,provider.name,input.amountMinor,input.feeMinor,input.currency,input.customer]);
    await c.query(`INSERT INTO payment_attempts(id,payment_id,provider,provider_payment_id,status) VALUES($1,$2,$3,$4,'PROCESSING')`, [newId('pat'),id,provider.name,reference]);
    await c.query(`INSERT INTO payment_events(id,payment_id,type,label) VALUES($1,$2,'PAYMENT_CREATED','Payment intent recorded')`, [newId('evt'),id]);
    await c.query('INSERT INTO idempotency_keys VALUES($1,$2,$3,202,$4)', [input.merchantId,input.kind,input.key,{ ...response, fingerprint }]);
    return { created: true, id, response };
  });
  if (!reservation.created) return reservation.response;
  let initiated;
  try {
    initiated = await provider.initiatePayment({ paymentReference: reservation.response.reference, amountMinor: input.amountMinor, currency: input.currency, channel: input.channel, customer: input.customer });
  } catch {
    // Timeout, invalid provider response, or lost connection: outcome unknown.
    // Return the durable reference so the customer can check its status.
    return reservation.response;
  }
  const response = { ...reservation.response, checkoutUrl: initiated.checkoutUrl ?? null };
  await transaction(db, async (c) => {
    await c.query('SELECT id FROM payments WHERE id=$1 FOR UPDATE', [reservation.id]);
    await c.query('UPDATE payments SET provider_checkout_url=$1,updated_at=now() WHERE id=$2', [response.checkoutUrl,reservation.id]);
    // A webhook may already have confirmed this payment; never regress it.
    await c.query(`UPDATE payment_attempts SET provider_payment_id=$1 WHERE payment_id=$2 AND status='PROCESSING'`, [initiated.providerPaymentId,reservation.id]);
    await c.query('UPDATE idempotency_keys SET response_body=$1 WHERE merchant_id=$2 AND operation=$3 AND key=$4', [{ ...response, fingerprint },input.merchantId,input.kind,input.key]);
  });
  return response;
}
