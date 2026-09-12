import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { processPaymentWebhook } from '../src/payments/webhookProcessor.js';
import type { ProviderWebhookEvent } from '../src/providers/types.js';
import { buildApp } from '../src/app.js';
import { SandboxPaymentProvider } from '../src/providers/sandboxProvider.js';
import type { Config } from '../src/config.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const schema = `webhook_test_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool;
let db: pg.Pool;

const baseEvent: ProviderWebhookEvent = {
  eventId: 'provider-event-1',
  eventType: 'payment.status.changed',
  paymentReference: 'GP-TEST-1',
  providerPaymentId: 'sbx_payment_1',
  status: 'SUCCEEDED',
  occurredAt: '2026-09-11T12:00:00.000Z',
};

function raw(event: ProviderWebhookEvent) { return Buffer.from(JSON.stringify(event)); }

suite('transactional webhook processing', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: databaseUrl! });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: databaseUrl!, options: `-c search_path=${schema}` });
    const migrationDir = resolve('migrations');
    for (const name of (await readdir(migrationDir)).filter((x) => x.endsWith('.sql')).sort()) {
      await db.query(await readFile(resolve(migrationDir, name), 'utf8'));
    }
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  });

  beforeEach(async () => {
    await db.query('TRUNCATE outbox_events,journal_postings,journal_entries,ledger_accounts,webhook_receipts,payment_attempts,payment_events,audit_events,payments,users,merchants CASCADE');
    await db.query(`INSERT INTO merchants(id,name) VALUES('m1','Test Merchant')`);
    await db.query(`INSERT INTO payments(id,merchant_id,reference,status,channel,provider_name,gross_minor,currency,customer,provider_submitted_at)
      VALUES('p1','m1','GP-TEST-1','PROCESSING','MOBILE_MONEY','sandbox',1000,'MWK','{}',now())`);
    await db.query(`INSERT INTO payment_attempts(id,payment_id,provider,provider_payment_id,status)
      VALUES('pa1','p1','sandbox','sbx_payment_1','PROCESSING')`);
  });

  it('applies a valid transition and creates one event and audit record', async () => {
    expect(await processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent))).toMatchObject({ outcome: 'PROCESSED', paymentStatus: 'SUCCEEDED' });
    expect((await db.query(`SELECT status FROM payments WHERE id='p1'`)).rows[0].status).toBe('SUCCEEDED');
    expect(Number((await db.query(`SELECT count(*) FROM payment_events WHERE payment_id='p1'`)).rows[0].count)).toBe(2);
    expect(Number((await db.query(`SELECT count(*) FROM audit_events WHERE resource_id='p1'`)).rows[0].count)).toBe(1);
    expect((await db.query(`SELECT status FROM payment_attempts WHERE id='pa1'`)).rows[0].status).toBe('SUCCEEDED');
    expect(Number((await db.query(`SELECT count(*) FROM journal_entries WHERE source_id='p1'`)).rows[0].count)).toBe(1);
    expect(Number((await db.query(`SELECT count(*) FROM outbox_events WHERE aggregate_id='p1'`)).rows[0].count)).toBe(1);
  });

  it('records an unknown payment without changing payment data', async () => {
    const event = { ...baseEvent, eventId: 'unknown-1', paymentReference: 'GP-MISSING' };
    expect(await processPaymentWebhook(db, 'sandbox', event, raw(event))).toEqual({ outcome: 'UNKNOWN_PAYMENT' });
    expect((await db.query(`SELECT processing_status,failure_code FROM webhook_receipts WHERE provider_event_id='unknown-1'`)).rows[0])
      .toMatchObject({ processing_status: 'FAILED', failure_code: 'UNKNOWN_PAYMENT' });
  });

  it('acknowledges duplicate delivery without duplicating events', async () => {
    await processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent));
    expect(await processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent))).toEqual({ outcome: 'DUPLICATE' });
    expect(Number((await db.query(`SELECT count(*) FROM payment_events WHERE payment_id='p1'`)).rows[0].count)).toBe(2);
    expect(Number((await db.query(`SELECT count(*) FROM journal_entries WHERE source_id='p1'`)).rows[0].count)).toBe(1);
  });

  it('rejects reuse of an event id with a changed payload and records it as suspicious', async () => {
    await processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent));
    const changed = { ...baseEvent, status: 'FAILED' as const };
    expect(await processPaymentWebhook(db, 'sandbox', changed, raw(changed))).toEqual({ outcome: 'PAYLOAD_CONFLICT' });
    expect((await db.query(`SELECT processing_status,failure_code FROM webhook_receipts WHERE provider_event_id=$1`, [baseEvent.eventId])).rows[0])
      .toMatchObject({ processing_status: 'SUSPICIOUS', failure_code: 'PAYLOAD_MISMATCH' });
  });

  it('rejects a late event without reversing a terminal state', async () => {
    await db.query(`UPDATE payments SET status='SUCCEEDED' WHERE id='p1'`);
    const late = { ...baseEvent, eventId: 'late-1', status: 'PENDING' as const };
    expect(await processPaymentWebhook(db, 'sandbox', late, raw(late))).toEqual({ outcome: 'INVALID_TRANSITION' });
    expect((await db.query(`SELECT status FROM payments WHERE id='p1'`)).rows[0].status).toBe('SUCCEEDED');
  });

  it('serializes concurrent duplicate deliveries', async () => {
    const results = await Promise.all([
      processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent)),
      processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent)),
    ]);
    expect(results.map((x) => x.outcome).sort()).toEqual(['DUPLICATE', 'PROCESSED']);
    expect(Number((await db.query(`SELECT count(*) FROM payment_events WHERE payment_id='p1'`)).rows[0].count)).toBe(2);
    expect(Number((await db.query(`SELECT count(*) FROM journal_entries WHERE source_id='p1'`)).rows[0].count)).toBe(1);
  });

  it('rolls back all state when a required write fails', async () => {
    await db.query(`CREATE OR REPLACE FUNCTION ${schema}.reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit failure'; END $$`);
    await db.query(`CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION ${schema}.reject_audit()`);
    await expect(processPaymentWebhook(db, 'sandbox', baseEvent, raw(baseEvent))).rejects.toThrow(/audit failure/);
    expect((await db.query(`SELECT status FROM payments WHERE id='p1'`)).rows[0].status).toBe('PROCESSING');
    expect(Number((await db.query(`SELECT count(*) FROM webhook_receipts`)).rows[0].count)).toBe(0);
    expect(Number((await db.query(`SELECT count(*) FROM journal_entries`)).rows[0].count)).toBe(0);
    expect(Number((await db.query(`SELECT count(*) FROM outbox_events`)).rows[0].count)).toBe(0);
    await db.query('DROP TRIGGER reject_audit ON audit_events');
  });

  it('trusted status remains read-only until backend-confirmed state changes', async () => {
    const config: Config = {
      NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 4000, DATABASE_URL: databaseUrl!,
      PASSWORD_PEPPER: 'p'.repeat(32), COOKIE_SECRET: 'c'.repeat(32), FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
      PAYMENT_PROVIDER: 'sandbox', SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32), WEBHOOK_TOLERANCE_SECONDS: 300,
      OUTBOX_WORKER_ENABLED: false, OUTBOX_POLL_MS: 1000, SESSION_TTL_HOURS: 12,
      WEBHOOK_ALLOW_HTTP_DEVELOPMENT: false, WEBHOOK_DELIVERY_TIMEOUT_MS: 5000,
      WEBHOOK_MAX_RESPONSE_BYTES: 8192, WEBHOOK_MAX_ATTEMPTS: 8,
    };
    const app = await buildApp(config, db, new SandboxPaymentProvider(config.SANDBOX_WEBHOOK_SECRET, 300, 'test'));
    const response = await app.inject({ method: 'GET', url: '/v1/payment-status/GP-TEST-1' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('PROCESSING');
    expect((await db.query(`SELECT status FROM payments WHERE id='p1'`)).rows[0].status).toBe('PROCESSING');
    await app.close();
  });
});
