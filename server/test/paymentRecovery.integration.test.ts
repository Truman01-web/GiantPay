import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { requireSafeTestDatabase } from './integrationGuard.js';
import { applyMigrations } from '../src/migrationRunner.js';
import { PaymentRecoveryWorker } from '../src/payments/recoveryWorker.js';
import { FlutterwavePaymentProvider, type FlutterwaveVerifyResponse } from '../src/providers/flutterwaveProvider.js';
import { processPaymentWebhook } from '../src/payments/webhookProcessor.js';

const url = process.env.TEST_DATABASE_URL ? requireSafeTestDatabase(process.env.TEST_DATABASE_URL).toString() : undefined;
const suite = url ? describe : describe.skip;
const schema = `recovery_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool;
function fixture(overrides = {}): FlutterwaveVerifyResponse {
  return { status: 'success', message: 'synthetic', data: { id: 123, tx_ref: 'GP-recovery', currency: 'MWK', amount: 10, status: 'successful', ...overrides } as NonNullable<FlutterwaveVerifyResponse['data']> };
}
function worker(response = fixture(), timeoutMs = 5000) {
  const client = { initiateCheckout: vi.fn(), verifyTransaction: vi.fn().mockResolvedValue(response), verifyByReference: vi.fn().mockResolvedValue(fixture()) };
  const provider = new FlutterwavePaymentProvider('test', 'test', 'test', 'http://localhost', client);
  return { instance: new PaymentRecoveryWorker(db, provider, timeoutMs), client };
}
const callback = { eventId: 'callback', eventType: 'payment.status.changed' as const, paymentReference: 'GP-recovery', providerPaymentId: '123', status: 'SUCCEEDED' as const, occurredAt: '2026-11-11T00:00:00.000Z' };
suite('uncertain payment recovery with real PostgreSQL', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url }); await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` }); await applyMigrations(db);
  });
  afterAll(async () => { await db?.end(); await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin?.end(); });
  beforeEach(async () => {
    await db.query('TRUNCATE outbox_events,journal_postings,journal_entries,ledger_accounts,webhook_receipts,payment_attempts,payment_events,audit_events,payments,users,merchants CASCADE');
    await db.query(`INSERT INTO merchants(id,name) VALUES('m','Synthetic');
      INSERT INTO payments(id,merchant_id,reference,status,channel,provider_name,gross_minor,currency,created_at)
      VALUES('p','m','GP-recovery','PROCESSING','CARD','flutterwave',1000,'MWK',now()-interval '2 minutes');
      INSERT INTO payment_attempts(id,payment_id,provider,status) VALUES('a','p','flutterwave','PROCESSING')`);
  });
  async function payment() { return (await db.query("SELECT * FROM payments WHERE id='p'")).rows[0]; }
  async function journals() { return Number((await db.query("SELECT count(*) n FROM journal_entries WHERE source_id='p'")).rows[0].n); }
  it('recovers ambiguous initiation through reference lookup without initiating a charge', async () => {
    const w = worker(); await w.instance.tick();
    expect(w.client.initiateCheckout).not.toHaveBeenCalled(); expect(w.client.verifyByReference).toHaveBeenCalledWith('GP-recovery');
    expect(w.client.verifyTransaction).toHaveBeenCalledWith('123'); expect((await payment()).status).toBe('SUCCEEDED'); expect(await journals()).toBe(1);
    expect((await db.query("SELECT count(*)::int n FROM outbox_events WHERE aggregate_id='p'")).rows[0].n).toBe(1);
  });
  it('serializes callback/recovery races and repeated ticks without duplicate ledger effects', async () => {
    const w = worker(); await Promise.all([w.instance.tick(), processPaymentWebhook(db,'flutterwave',callback,Buffer.from(JSON.stringify(callback))), worker().instance.tick()]);
    await worker().instance.tick(); expect(await journals()).toBe(1); expect((await payment()).status).toBe('SUCCEEDED');
  });
  it.each([{ id: 124 }, { tx_ref: 'other' }, { currency: 'USD' }, { amount: 11 }, { amount: NaN }, { status: 'failed' }, { status: 'pending' }])('leaves mismatch or non-success unresolved: %j', async change => {
    await worker(fixture(change)).instance.tick(); expect((await payment()).status).toBe('PROCESSING'); expect(await journals()).toBe(0);
  });
  it('backs off provider outages, retains reservations and escalates after a bounded budget', async () => {
    const w = worker(); w.client.verifyByReference.mockRejectedValue(new Error('synthetic outage secret must not persist'));
    await db.query("UPDATE payments SET recovery_attempts=7 WHERE id='p'"); await w.instance.tick();
    const p = await payment(); expect(p.status).toBe('PROCESSING'); expect(p.recovery_attempts).toBe(8); expect(p.recovery_escalated_at).not.toBeNull();
    expect(new Date(p.recovery_next_at).getTime()).toBeGreaterThan(Date.now()); expect(await w.instance.tick()).toBe(false);
    const audit = (await db.query("SELECT action,metadata FROM audit_events WHERE resource_id='p'")).rows;
    expect(audit).toContainEqual(expect.objectContaining({ action:'PAYMENT_RECOVERY_ESCALATED' })); expect(JSON.stringify(audit)).not.toContain('secret');
  });
  it('recovers an expired lease after restart without resetting the attempt budget', async () => {
    await db.query("UPDATE payments SET recovery_attempts=2,recovery_lease_token='dead-worker',recovery_lease_until=now()-interval '1 second' WHERE id='p'");
    await worker().instance.tick(); expect((await payment()).recovery_attempts).toBe(3); expect(await journals()).toBe(1);
  });
  it('does not steal a live lease or retry an exhausted crashed worker', async () => {
    await db.query("UPDATE payments SET recovery_lease_until=now()+interval '1 minute' WHERE id='p'"); expect(await worker().instance.tick()).toBe(false);
    await db.query("UPDATE payments SET recovery_lease_until=now()-interval '1 second',recovery_attempts=8 WHERE id='p'");
    const w = worker(); await w.instance.tick(); expect(w.client.verifyByReference).not.toHaveBeenCalled(); expect((await payment()).recovery_escalated_at).not.toBeNull();
  });
  it('bounds a stalled provider and treats missing reference records as unresolved', async () => {
    const w = worker(fixture(), 100); w.client.verifyByReference.mockImplementation(() => new Promise(() => {})); await w.instance.tick();
    expect((await payment()).status).toBe('PROCESSING'); expect(await journals()).toBe(0);
    await db.query("UPDATE payments SET recovery_next_at=now() WHERE id='p'"); w.client.verifyByReference.mockResolvedValue({ status:'error',message:'missing' });
    await w.instance.tick(); expect((await payment()).status).toBe('PROCESSING');
  });
  it('uses the already-bound ID and rejects a different verified transaction', async () => {
    await db.query("UPDATE payments SET provider_transaction_id='123' WHERE id='p'"); const w = worker(fixture({id:124})); await w.instance.tick();
    expect(w.client.verifyByReference).not.toHaveBeenCalled(); expect(await journals()).toBe(0);
  });
  it('recovers pending payments and accepts a verified callback after escalation', async () => {
    await db.query("UPDATE payments SET status='PENDING',recovery_escalated_at=now() WHERE id='p'");
    expect(await worker().instance.tick()).toBe(false);
    await processPaymentWebhook(db,'flutterwave',callback,Buffer.from(JSON.stringify(callback)));
    expect((await payment()).status).toBe('SUCCEEDED'); expect(await journals()).toBe(1);
  });
  it('prevents two recovery workers from verifying the same live lease', async () => {
    let release!: (value: FlutterwaveVerifyResponse) => void;
    let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    const w = worker(); w.client.verifyByReference.mockImplementation(() => { started(); return new Promise(resolve => { release = resolve; }); });
    const running = w.instance.tick(); await waiting;
    expect(await worker().instance.tick()).toBe(false); release(fixture()); await running;
    expect(await journals()).toBe(1);
  });
});
