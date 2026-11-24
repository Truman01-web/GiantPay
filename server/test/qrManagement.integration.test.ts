import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { applyMigrations } from '../src/migrationRunner.js';
import { tokenHash } from '../src/security.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = process.env.TEST_DATABASE_URL ? requireSafeTestDatabase(process.env.TEST_DATABASE_URL).toString() : undefined;
const suite = url ? describe : describe.skip;
const schema = `qr_management_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool, app: Awaited<ReturnType<typeof buildApp>>;
const headers = (token = 'owner-token') => ({ cookie: `giantpay_session=${token}; giantpay_csrf=synthetic`, origin: 'http://127.0.0.1:5173', 'x-csrf-token': 'synthetic' });
suite('QR management preserves merchant controls and safe URLs', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url }); await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` }); await applyMigrations(db);
    await db.query(`INSERT INTO merchants(id,name) VALUES('m1','Synthetic One'),('m2','Synthetic Two');
      INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions,email_verified_at) VALUES
      ('u1','m1','One','one@example.test','synthetic','OWNER',ARRAY['payments.links:manage'],now()),
      ('u2','m2','Two','two@example.test','synthetic','OWNER',ARRAY['payments.links:manage'],now()),
      ('u3','m1','Reader','reader@example.test','synthetic','VIEWER',ARRAY['payments:read'],now())`);
    for (const [token, user] of [['owner-token', 'u1'], ['other-token', 'u2'], ['reader-token', 'u3']]) await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,now()+interval '1 hour',now()+interval '2 hours',now())`, [tokenHash(token!), user]);
    app = await buildApp(loadConfig({ NODE_ENV: 'test', DATABASE_URL: url!, PASSWORD_PEPPER: 'p'.repeat(32), COOKIE_SECRET: 'c'.repeat(32), FRONTEND_ORIGIN: 'http://127.0.0.1:5173', SANDBOX_WEBHOOK_SECRET: 's'.repeat(32) }), db);
  });
  afterAll(async () => { await app?.close(); await db?.end(); await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin?.end(); });
  async function create(extra = {}) {
    return app.inject({ method: 'POST', url: '/v1/qr', headers: { ...headers(), 'idempotency-key': randomUUID() }, payload: { label: 'Synthetic Counter', mode: 'FIXED', amountMinor: 10000, ...extra } });
  }
  it('creates a configured local opaque URL and preserves fixed/custom constraints', async () => {
    const response = await create(); expect(response.statusCode, response.body).toBe(201);
    expect(response.json().checkoutUrl).toMatch(/^http:\/\/127\.0\.0\.1:5173\/checkout\/qr\/[A-Za-z0-9_-]{43}$/);
    expect(response.json().amountMinor).toBe(10000);
    const custom = await create({ mode: 'CUSTOMER_ENTERED', amountMinor: undefined, minAmountMinor: 5000, maxAmountMinor: 20000, maxSuccessfulPayments: 2 });
    expect(custom.statusCode, custom.body).toBe(201);
    expect(custom.json()).toMatchObject({ minAmountMinor: 5000, maxAmountMinor: 20000, maxSuccessfulPayments: 2 });
  });
  it('uses configured origin on reads and idempotent retries regardless of Host', async () => {
    const key = randomUUID();
    const options = { method: 'POST' as const, url: '/v1/qr', headers: { ...headers(), host: 'attacker.example', 'idempotency-key': key }, payload: { label: 'Stable', mode: 'FIXED', amountMinor: 100 } };
    const first = await app.inject(options);
    expect(first.statusCode).toBe(201);
    const code = first.json();
    await db.query("UPDATE idempotency_keys SET response_body = jsonb_set(response_body, '{result,checkoutUrl}', '\"https://old.example/checkout/qr/stale\"'::jsonb) WHERE merchant_id='m1' AND operation='create-qr' AND key=$1", [key]);
    const retry = await app.inject(options);
    expect(retry.json().id).toBe(code.id);
    expect(retry.json().checkoutUrl).toBe(code.checkoutUrl);
    expect((await app.inject({ url: `/v1/qr/${code.id}`, headers: { ...headers(), host: 'attacker.example' } })).json().checkoutUrl).toBe(code.checkoutUrl);
    const list = await app.inject({ url: '/v1/qr', headers: headers() });
    expect(list.json().data.find((item: { id: string }) => item.id === code.id).checkoutUrl).toBe(code.checkoutUrl);
  });
  it('requires login, tenant permissions and CSRF on QR mutations', async () => {
    expect((await app.inject('/v1/qr')).statusCode).toBe(401);
    const denied = await app.inject({ method: 'POST', url: '/v1/qr', headers: { ...headers('reader-token'), 'idempotency-key': randomUUID() }, payload: { label: 'No permission', mode: 'FIXED', amountMinor: 100 } });
    expect(denied.statusCode, denied.body).toBe(403);
    const noCsrf = { ...headers(), 'idempotency-key': randomUUID(), 'x-csrf-token': 'wrong' };
    expect((await app.inject({ method: 'POST', url: '/v1/qr', headers: noCsrf, payload: { label: 'No CSRF', mode: 'FIXED', amountMinor: 100 } })).statusCode).toBe(403);
    const code = (await create()).json();
    expect((await app.inject({ url: `/v1/qr/${code.id}`, headers: headers('other-token') })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: `/v1/qr/${code.id}`, headers: headers('other-token'), payload: { status: 'DISABLED' } })).statusCode).toBe(404);
  });
  it('reports expired/used-up codes accurately to merchant and customer and rejects submission', async () => {
    for (const condition of ["expires_at=now()-interval '1 minute'", 'max_successful_payments=1,successful_payments_count=1']) {
      const code = (await create()).json(); await db.query(`UPDATE scan_to_pay_codes SET ${condition} WHERE id=$1`, [code.id]);
      expect((await app.inject({ url: `/v1/qr/${code.id}`, headers: headers() })).json().status).toBe('EXPIRED');
      const path = new URL(code.checkoutUrl).pathname;
      const info = await app.inject(`/v1${path}`); expect(info.json().status).toBe('EXPIRED');
      expect(info.headers['x-robots-tag']).toContain('noindex');
      const submission = await app.inject({ method: 'POST', url: `/v1${path}/submit`, headers: { 'idempotency-key': randomUUID() }, payload: { channel: 'CARD', customer: {} } });
      expect([409, 410]).toContain(submission.statusCode);
    }
  });
});
