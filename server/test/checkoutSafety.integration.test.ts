import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { applyMigrations } from '../src/migrationRunner.js';
import { FlutterwavePaymentProvider, type FlutterwaveHttpClient, type FlutterwaveVerifyResponse } from '../src/providers/flutterwaveProvider.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = process.env.TEST_DATABASE_URL ? requireSafeTestDatabase(process.env.TEST_DATABASE_URL).toString() : undefined;
const suite = url ? describe : describe.skip;
const schema = `checkout_safety_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool, app: Awaited<ReturnType<typeof buildApp>>;
const initiateCheckout = vi.fn<FlutterwaveHttpClient['initiateCheckout']>();
const verifyTransaction = vi.fn<FlutterwaveHttpClient['verifyTransaction']>();
const customer = { name: 'Synthetic Customer', phone: '+265991234567', email: 'customer@example.test' };
let clientNumber = 0;

function verified(reference: string, patch: Record<string, unknown> = {}): FlutterwaveVerifyResponse {
  return { status: 'success', message: '', data: { id: 123, tx_ref: reference, flw_ref: 'synthetic', status: 'successful', currency: 'MWK', amount: 100, ...patch } } as FlutterwaveVerifyResponse;
}
function submit(key = randomUUID(), token = 'qr-token', requestedAmountMinor = 1) {
  return app.inject({ method: 'POST', url: `/v1/checkout/qr/${token}/submit`, remoteAddress: `192.0.2.${++clientNumber}`, headers: { 'idempotency-key': key }, payload: { channel: 'CARD', requestedAmountMinor, customer } });
}
function webhook(reference: string, id = 123) {
  return app.inject({ method: 'POST', url: '/v1/webhooks/providers/flutterwave', headers: { 'verif-hash': 'synthetic-hash' }, payload: { event: 'charge.completed', data: { id, tx_ref: reference, flw_ref: 'synthetic', status: 'successful', currency: 'MWK', amount: 100, charged_amount: 100, customer: { phone_number: null } } } });
}
async function counts() {
  return (await db.query(`SELECT (SELECT count(*)::int FROM payments) payments,(SELECT count(*)::int FROM journal_entries) journals,(SELECT count(*)::int FROM webhook_receipts) receipts,(SELECT successful_payments_count FROM scan_to_pay_codes WHERE id='qr') successes`)).rows[0];
}

suite('hosted and QR checkout with real transactional storage', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 20 });
    await applyMigrations(db);
    const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: url!, PASSWORD_PEPPER: 'p'.repeat(32), COOKIE_SECRET: 'c'.repeat(32), FRONTEND_ORIGIN: 'http://127.0.0.1:5173', SANDBOX_WEBHOOK_SECRET: 's'.repeat(32) });
    const provider = new FlutterwavePaymentProvider('FLWSECK_TEST-synthetic-only', 'synthetic', 'synthetic-hash', 'http://127.0.0.1:4000', { initiateCheckout, verifyTransaction });
    app = await buildApp(config, db, provider);
  });
  afterAll(async () => { await app?.close(); await db?.end(); await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin?.end(); });
  beforeEach(async () => {
    await db.query('TRUNCATE merchants CASCADE');
    await db.query('TRUNCATE idempotency_keys,webhook_receipts,outbox_events CASCADE');
    await db.query(`INSERT INTO merchants(id,name) VALUES('merchant','Synthetic Merchant'); INSERT INTO users(id,merchant_id,name,email,password_hash,role) VALUES('owner','merchant','Owner','owner@example.test','synthetic','OWNER'); INSERT INTO scan_to_pay_codes(id,merchant_id,created_by,label,mode,amount_minor,token) VALUES('qr','merchant','owner','Counter','FIXED',10000,'qr-token'); INSERT INTO payment_links(id,merchant_id,token,name,mode,amount_minor,currency,reusable) VALUES('link','merchant','link-token','Invoice','FIXED',10000,'MWK',true)`);
    initiateCheckout.mockReset().mockResolvedValue({ status: 'success', message: '', data: { link: 'https://checkout.flutterwave.com/synthetic' } });
    verifyTransaction.mockReset();
  });

  it.each(['timeout', 'pending', 'amount', 'currency', 'reference', 'transaction-id'])('does not consume or credit a %s verification failure and permits retry', async (failure) => {
    const reference = (await submit()).json().reference;
    if (failure === 'timeout') verifyTransaction.mockRejectedValueOnce(new Error('synthetic timeout'));
    else {
      const mutations: Record<string, Record<string, unknown>> = { pending: { status: 'pending' }, amount: { amount: 99 }, currency: { currency: 'USD' }, reference: { tx_ref: 'other' }, 'transaction-id': { id: 999 } };
      verifyTransaction.mockResolvedValueOnce(verified(reference, mutations[failure]));
    }
    const response = await webhook(reference);
    expect(response.statusCode, response.body).toBe(['timeout', 'pending'].includes(failure) ? 503 : 409);
    expect(await counts()).toMatchObject({ journals: 0, receipts: 0, successes: 0 });
    expect((await db.query('SELECT status FROM payments')).rows[0].status).toBe('PROCESSING');
    verifyTransaction.mockResolvedValue(verified(reference));
    expect((await webhook(reference)).statusCode).toBe(202);
    expect(await counts()).toMatchObject({ journals: 1, successes: 1 });
  });

  it('persists an ambiguous initiation before I/O and never resubmits the same attempt', async () => {
    initiateCheckout.mockImplementation(async (payload) => {
      expect((await db.query('SELECT reference FROM payments')).rows[0].reference).toBe(payload.tx_ref);
      throw new Error('synthetic response lost after provider acceptance');
    });
    const key = randomUUID(), first = await submit(key), retry = await submit(key);
    expect(first.statusCode).toBe(202);
    expect(retry.json()).toEqual(first.json());
    expect(first.json().checkoutUrl).toBeNull();
    expect(initiateCheckout).toHaveBeenCalledTimes(1);
    expect(await counts()).toMatchObject({ payments: 1, journals: 0 });
    verifyTransaction.mockResolvedValue(verified(first.json().reference));
    expect((await webhook(first.json().reference)).statusCode).toBe(202);
    expect(await counts()).toMatchObject({ journals: 1 });
  });

  it('serializes concurrent same-key QR submissions and rejects changed payloads', async () => {
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 6 }, () => submit(key)));
    expect(results.every(r => r.statusCode === 202)).toBe(true);
    expect(new Set(results.map(r => r.json().reference)).size).toBe(1);
    expect(initiateCheckout).toHaveBeenCalledTimes(1);
    expect(await counts()).toMatchObject({ payments: 1 });
    const conflict = await app.inject({ method: 'POST', url: '/v1/checkout/qr/qr-token/submit', headers: { 'idempotency-key': key }, payload: { channel: 'CARD', customer: { ...customer, name: 'Changed' } } });
    expect(conflict.statusCode).toBe(409);
  });

  it('reserves the last QR slot atomically across distinct keys, including uncertain outcomes', async () => {
    await db.query(`UPDATE scan_to_pay_codes SET max_successful_payments=1 WHERE id='qr'`);
    initiateCheckout.mockRejectedValue(new Error('synthetic timeout'));
    const results = await Promise.all(Array.from({ length: 6 }, () => submit()));
    expect(results.filter(r => r.statusCode === 202)).toHaveLength(1);
    expect(results.filter(r => r.statusCode === 409)).toHaveLength(5);
    expect(initiateCheckout).toHaveBeenCalledTimes(1);
    expect(await counts()).toMatchObject({ payments: 1, journals: 0 });
  });

  it('uses authoritative fixed QR amount and bounds customer-entered amounts', async () => {
    expect((await submit()).statusCode).toBe(202);
    expect(initiateCheckout.mock.calls[0]![0].amount).toBe('100.00');
    await db.query(`UPDATE scan_to_pay_codes SET mode='CUSTOMER_ENTERED',amount_minor=NULL,min_amount_minor=5000,max_amount_minor=20000 WHERE id='qr'`);
    expect((await submit(randomUUID(), 'qr-token', 4999)).statusCode).toBe(422);
    expect((await submit(randomUUID(), 'qr-token', 20001)).statusCode).toBe(422);
    expect((await submit(randomUUID(), 'qr-token', 7500)).statusCode).toBe(202);
    expect(initiateCheckout.mock.calls[1]![0].amount).toBe('75.00');
  });

  it('posts one ledger journal and increments QR success once across concurrent webhook and redirect callbacks', async () => {
    const reference = (await submit()).json().reference;
    verifyTransaction.mockResolvedValue(verified(reference));
    const results = await Promise.all([webhook(reference), webhook(reference), app.inject(`/v1/webhooks/providers/flutterwave/redirect?tx_ref=${reference}&transaction_id=123&status=failed`)]);
    expect(results.map(r => r.statusCode).sort()).toEqual([202, 202, 302]);
    expect(await counts()).toMatchObject({ journals: 1, successes: 1 });
    expect((await db.query('SELECT count(*)::int n FROM outbox_events WHERE event_type=\'payment.succeeded\'')).rows[0].n).toBe(1);
  });

  it('rejects a second verified transaction ID for an already credited payment', async () => {
    const reference = (await submit()).json().reference;
    verifyTransaction.mockResolvedValue(verified(reference));
    expect((await webhook(reference)).statusCode).toBe(202);
    verifyTransaction.mockResolvedValue(verified(reference, { id: 456 }));
    expect((await webhook(reference, 456)).statusCode).toBe(409);
    expect(await counts()).toMatchObject({ journals: 1, successes: 1 });
  });

  it('keeps a callback-confirmed success when initiation completes later', async () => {
    initiateCheckout.mockImplementation(async (payload) => {
      verifyTransaction.mockResolvedValue(verified(payload.tx_ref));
      expect((await webhook(payload.tx_ref)).statusCode).toBe(202);
      return { status: 'success', message: '', data: { link: 'https://checkout.flutterwave.com/synthetic' } };
    });
    const response = await submit();
    expect(response.statusCode).toBe(202);
    expect((await db.query('SELECT status FROM payments')).rows[0].status).toBe('SUCCEEDED');
    expect((await db.query('SELECT status,provider_payment_id FROM payment_attempts')).rows[0]).toEqual({ status: 'SUCCEEDED', provider_payment_id: '123' });
  });

  it('rejects the sandbox webhook endpoint for a Flutterwave payment', async () => {
    expect((await app.inject({ method: 'POST', url: '/v1/webhooks/providers/sandbox', payload: {}, headers: { 'x-giantpay-signature': 'synthetic-hash' } })).statusCode).toBe(404);
    expect(await counts()).toMatchObject({ journals: 0 });
  });

  it('resumes a pre-022 checkout retry without a new provider call and rejects altered legacy retries', async () => {
    const key = randomUUID();
    const payload = { channel: 'CARD', customer };
    const first = await app.inject({ method: 'POST', url: '/v1/checkout/link-token/submit', headers: { 'idempotency-key': key }, payload });
    expect(first.statusCode).toBe(202);
    await db.query(`UPDATE idempotency_keys SET response_body=$1 WHERE operation='checkout' AND key=$2`, [{ reference: first.json().reference },key]);
    const changed = await app.inject({ method: 'POST', url: '/v1/checkout/link-token/submit', headers: { 'idempotency-key': key }, payload: { channel: 'CARD', customer: { ...customer, name: 'Changed' } } });
    expect(changed.statusCode).toBe(409);
    const retry = await app.inject({ method: 'POST', url: '/v1/checkout/link-token/submit', headers: { 'idempotency-key': key }, payload });
    expect(retry.statusCode, retry.body).toBe(202);
    expect(retry.json().reference).toBe(first.json().reference);
    expect(initiateCheckout).toHaveBeenCalledTimes(1);
  });
});
