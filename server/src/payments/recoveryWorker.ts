import { randomUUID } from 'node:crypto';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { newId } from '../security.js';
import { operationalMetrics } from '../operations/metrics.js';
import { processPaymentWebhook } from './webhookProcessor.js';

export interface RecoveryVerifier {
  recoverPayment(expected: { reference: string; amountMinor: number; currency: string; transactionId: string | null }, signal?: AbortSignal): Promise<{ flwTransactionId: string; status: 'SUCCEEDED' | 'PROCESSING' }>;
}
export const RECOVERY_MAX_ATTEMPTS = 8;
export const recoveryDelaySeconds = (attempt: number) => Math.min(3600, 30 * 2 ** Math.min(attempt, 8));

// One leased payment per tick bounds external work and keeps transactions short.
// No initiation capability is exposed to this worker.
export class PaymentRecoveryWorker {
  private shutdown = new AbortController();
  private running = new Set<Promise<boolean>>();
  constructor(private db: Db, private verifier: RecoveryVerifier, private timeoutMs = 45_000) {}

  stop() { this.shutdown.abort(); }
  async drain() { await Promise.allSettled([...this.running]); }
  tick() {
    if (this.shutdown.signal.aborted) return Promise.resolve(false);
    const task = this.run();
    this.running.add(task);
    void task.finally(() => this.running.delete(task)).catch(() => {});
    return task;
  }
  private async run() {
    const token = randomUUID();
    const payment = await transaction(this.db, async c => {
      const row = (await c.query(`SELECT id,recovery_attempts FROM payments WHERE provider_name='flutterwave'
        AND status IN ('PROCESSING','PENDING') AND recovery_escalated_at IS NULL
        AND created_at < now()-interval '1 minute' AND recovery_next_at <= now()
        AND (recovery_lease_until IS NULL OR recovery_lease_until < now())
        ORDER BY recovery_next_at,id FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
      if (!row) return null;
      const claimed = (await c.query(`UPDATE payments SET recovery_attempts=least(recovery_attempts+1,8),
        recovery_lease_token=$2,recovery_lease_until=now()+interval '2 minutes',
        recovery_next_at=now()+($3 || ' seconds')::interval
        WHERE id=$1 RETURNING id,merchant_id,reference,gross_minor,currency,provider_transaction_id,recovery_attempts`, [row.id, token, String(recoveryDelaySeconds(Math.min(row.recovery_attempts+1,RECOVERY_MAX_ATTEMPTS)))])).rows[0];
      await c.query(`INSERT INTO audit_events(id,merchant_id,action,resource_type,resource_id,metadata)
        VALUES($1,$2,'PAYMENT_RECOVERY_CLAIMED','payment',$3,$4)`,
      [newId('aud'),claimed.merchant_id,claimed.id,{ attempt: claimed.recovery_attempts }]);
      return { ...claimed, shouldVerify: row.recovery_attempts < RECOVERY_MAX_ATTEMPTS };
    });
    if (!payment) return false;
    let outcome = 'UNRESOLVED';
    if (payment.shouldVerify && !this.shutdown.signal.aborted) {
      const deadline = new AbortController();
      const signal = AbortSignal.any([deadline.signal,this.shutdown.signal]);
      const timer = setTimeout(() => deadline.abort(), this.timeoutMs);
      let onAbort: (() => void) | undefined;
      try {
        const result = await Promise.race([
          this.verifier.recoverPayment({ reference: payment.reference, amountMinor: Number(payment.gross_minor), currency: payment.currency, transactionId: payment.provider_transaction_id },signal),
          new Promise<never>((_, reject) => { onAbort = () => reject(new Error('RECOVERY_ABORTED')); if (signal.aborted) onAbort(); else signal.addEventListener('abort',onAbort,{once:true}); }),
        ]);
        if (result.status === 'SUCCEEDED') {
          const event = { eventId: `recovery:${payment.id}:${result.flwTransactionId}`, eventType: 'payment.status.changed' as const,
            paymentReference: payment.reference, providerPaymentId: result.flwTransactionId, status: 'SUCCEEDED' as const, occurredAt: '1970-01-01T00:00:00.000Z' };
          if (signal.aborted) throw new Error('RECOVERY_ABORTED');
          const processed = await processPaymentWebhook(this.db, 'flutterwave', event, Buffer.from(JSON.stringify(event)), {paymentId:payment.id,token});
          outcome = processed.outcome === 'PROCESSED' || processed.outcome === 'DUPLICATE' ? 'VERIFIED' : 'CONFLICT';
        }
      } catch { outcome = 'UNRESOLVED'; } // Never persist provider messages or credentials.
      finally { clearTimeout(timer); if (onAbort) signal.removeEventListener('abort',onAbort); }
    }
    await transaction(this.db, async c => {
      const updated = await c.query(`UPDATE payments SET recovery_lease_token=NULL,recovery_lease_until=NULL,
        recovery_outcome=$3,recovery_next_at=now()+($4 || ' seconds')::interval,
        recovery_escalated_at=CASE WHEN status IN ('PROCESSING','PENDING') AND (recovery_attempts >= $5 OR $3='CONFLICT') THEN coalesce(recovery_escalated_at,now()) ELSE recovery_escalated_at END
        WHERE id=$1 AND recovery_lease_token=$2 AND recovery_lease_until > clock_timestamp() RETURNING merchant_id,status,recovery_escalated_at`,
      [payment.id,token,outcome,String(recoveryDelaySeconds(payment.recovery_attempts)),RECOVERY_MAX_ATTEMPTS]);
      if (!updated.rowCount) return;
      const row = updated.rows[0];
      await c.query(`INSERT INTO audit_events(id,merchant_id,action,resource_type,resource_id,metadata)
        VALUES($1,$2,$3,'payment',$4,$5)`, [newId('aud'),row.merchant_id,row.recovery_escalated_at ? 'PAYMENT_RECOVERY_ESCALATED' : 'PAYMENT_RECOVERY_CHECKED',payment.id,{ outcome, attempt: payment.recovery_attempts }]);
      operationalMetrics.increment('worker_jobs_total', { worker: 'payment_recovery', outcome: row.recovery_escalated_at ? 'ESCALATED' : outcome });
    });
    return true;
  }
}
