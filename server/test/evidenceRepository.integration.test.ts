import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { PgEvidenceRepository } from '../src/evidence/repository.js';
import type { EvidenceStore } from '../src/evidence/service.js';
import { MemoryRateLimitStore } from '../src/rateLimit.js';
import { tokenHash } from '../src/security.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = process.env.TEST_DATABASE_URL
  ? requireSafeTestDatabase(process.env.TEST_DATABASE_URL, process.env.ALLOW_REMOTE_TEST_DATABASE === 'true').toString()
  : undefined;
const suite = url ? describe : describe.skip;
const schema = `evidence_repo_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool;
let db: pg.Pool;
let repository: PgEvidenceRepository;
let appWithoutRuntime: Awaited<ReturnType<typeof buildApp>>;
let appWithRuntime: Awaited<ReturnType<typeof buildApp>>;
const objects = new Map<string, Buffer>();
const store: EvidenceStore = {
  async put(id, value) { objects.set(id, Buffer.from(value)); },
  async get(id) { const value = objects.get(id); if (!value) throw new Error('missing test object'); return Buffer.from(value); },
  async delete(id) { objects.delete(id); },
};
const session = (token: string) => ({ cookie: `giantpay_session=${token}; giantpay_csrf=c`, origin: 'http://127.0.0.1:5173', 'x-csrf-token': 'c' });
let serial = 0;

const evidence = (overrides: Record<string, unknown> = {}) => {
  serial += 1;
  const suffix = String(serial).padStart(4, '0');
  return {
    id: `evd_test_${suffix}`,
    applicationId: 'app1',
    merchantId: 'm1',
    uploaderId: 'u1',
    category: 'BUSINESS_REGISTRATION',
    ownerType: 'MERCHANT',
    ownerId: null,
    fileName: `evidence-${suffix}.pdf`,
    mediaType: 'application/pdf' as const,
    sizeBytes: 12,
    sha256: suffix.padStart(64, '0'),
    idempotencyKey: `upload-key-${suffix}`,
    requestSha256: suffix.padStart(64, 'a'),
    ...overrides,
  };
};

suite('persistent evidence repository', () => {
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url! });
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: url!, options: `-c search_path=${schema}` });
    for (const name of (await readdir(resolve('migrations'))).filter(name => name.endsWith('.sql')).sort()) {
      await db.query(await readFile(resolve('migrations', name), 'utf8'));
    }
    await db.query(`
      INSERT INTO merchants(id,name) VALUES('m1','One'),('m2','Two');
      INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status)
      VALUES('u1','m1','One','one@example.invalid','one@example.invalid','x','OWNER',ARRAY['onboarding:read','onboarding:write'],'ACTIVE'),
            ('u2','m2','Two','two@example.invalid','two@example.invalid','x','OWNER',ARRAY['onboarding:read','onboarding:write'],'ACTIVE'),
            ('limited','m1','Limited','limited@example.invalid','limited@example.invalid','x','ANALYST',ARRAY[]::text[],'ACTIVE');
      INSERT INTO onboarding_applications(id,merchant_id,created_by) VALUES('app1','m1','u1'),('app2','m2','u2');
    `);
    for (const [token, user] of [['one-token', 'u1'], ['two-token', 'u2'], ['limited-token', 'limited']] as const) {
      await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,now()+interval '1 hour',now()+interval '2 hours',now())`, [tokenHash(token), user]);
    }
    repository = new PgEvidenceRepository(db, 'k'.repeat(32));
    const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: url!, PASSWORD_PEPPER: 'p'.repeat(32), COOKIE_SECRET: 'c'.repeat(32), FRONTEND_ORIGIN: 'http://127.0.0.1:5173', PAYMENT_PROVIDER: 'sandbox', SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32) });
    appWithoutRuntime = await buildApp(config, db, undefined, undefined, new MemoryRateLimitStore());
    appWithRuntime = await buildApp(config, db, undefined, undefined, new MemoryRateLimitStore(), undefined, { store, scanner: { name: 'test-scanner', scan: async () => 'CLEAN' } });
  }, 60_000);

  afterAll(async () => {
    await appWithoutRuntime?.close();
    await appWithRuntime?.close();
    await db?.end();
    await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin?.end();
  }, 60_000);

  it('scopes lookup to the owning merchant and keeps private references out of the record', async () => {
    const inserted = await repository.reserve(evidence());
    expect(await repository.find(inserted.record.id, 'm2')).toBeNull();
    expect(await repository.find(inserted.record.id, 'm1')).toMatchObject({ merchantId: 'm1', scanState: 'QUARANTINED' });
    expect(inserted.record).not.toHaveProperty('storageReference');
    expect(inserted.record).not.toHaveProperty('storage_reference_ciphertext');
  });

  it('returns an identical retry and rejects conflicting key reuse', async () => {
    const input = evidence();
    const first = await repository.reserve(input);
    expect((await repository.reserve({ ...input, id: 'evd_retry_other' })).record.id).toBe(first.record.id);
    await expect(repository.reserve({ ...input, id: 'evd_conflict', requestSha256: 'f'.repeat(64) }))
      .rejects.toMatchObject({ code: 'EVIDENCE_IDEMPOTENCY_CONFLICT', status: 409 });
  });

  it('serializes simultaneous retries to one persistent record', async () => {
    const input = evidence();
    const [left, right] = await Promise.all([
      repository.reserve(input),
      repository.reserve({ ...input, id: 'evd_concurrent_other' }),
    ]);
    expect([left.created, right.created].sort()).toEqual([false, true]);
    expect(left.record.id).toBe(right.record.id);
  });

  it('rejects evidence creation after the application becomes immutable', async () => {
    await db.query(`UPDATE onboarding_applications SET status='SUBMITTED',submitted_snapshot='{}'::jsonb WHERE id='app2'`);
    await expect(repository.reserve(evidence({ applicationId: 'app2', merchantId: 'm2', uploaderId: 'u2' }))).rejects.toMatchObject({ code: 'EVIDENCE_APPLICATION_IMMUTABLE', status: 409 });
  });

  it('enforces transition races and writes state audit events atomically', async () => {
    const inserted = await repository.reserve(evidence());
    const [a, b] = await Promise.allSettled([
      repository.transition(inserted.record.id, 'm1', 'QUARANTINED', 'SCANNING', 'u1', { scanner: 'test' }),
      repository.transition(inserted.record.id, 'm1', 'QUARANTINED', 'SCANNING', 'u1', { scanner: 'test' }),
    ]);
    expect([a.status, b.status].sort()).toEqual(['fulfilled', 'rejected']);
    const audit = await db.query(`SELECT action FROM audit_events WHERE resource_id=$1 ORDER BY occurred_at`, [inserted.record.id]);
    expect(audit.rows.map(row => row.action)).toEqual(['ONBOARDING_EVIDENCE_QUARANTINED', 'ONBOARDING_EVIDENCE_SCANNING']);
  });

  it('rolls back the record when its quarantine audit write fails', async () => {
    await db.query(`CREATE FUNCTION fail_evidence_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ONBOARDING_EVIDENCE_QUARANTINED' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END $$`);
    await db.query(`CREATE TRIGGER fail_evidence_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_evidence_audit()`);
    const input = evidence();
    await expect(repository.reserve(input)).rejects.toThrow(/audit unavailable/);
    expect(Number((await db.query(`SELECT count(*) FROM onboarding_evidence WHERE id=$1`, [input.id])).rows[0].count)).toBe(0);
    await db.query(`DROP TRIGGER fail_evidence_audit ON audit_events`);
    await db.query(`DROP FUNCTION fail_evidence_audit()`);
  });

  it('returns explicit unavailable and permission responses when adapters or authority are absent', async () => {
    const retired = await appWithoutRuntime.inject({ method: 'POST', url: '/v1/merchants/onboarding/evidence', headers: { ...session('one-token'), 'idempotency-key': 'secure-metadata-denied' }, payload: { category: 'BUSINESS_REGISTRATION', ownerType: 'MERCHANT', mediaType: 'application/pdf', sizeBytes: 12, sha256: 'a'.repeat(64), fileName: 'record.pdf' } });
    expect(retired.statusCode, retired.body).toBe(410);
    expect(retired.json().error.code).toBe('EVIDENCE_METADATA_REGISTRATION_RETIRED');
    const unavailable = await appWithoutRuntime.inject({ method: 'POST', url: '/v1/merchants/onboarding/evidence/upload', headers: { ...session('one-token'), 'idempotency-key': 'unavailable-upload' } });
    expect(unavailable.statusCode, unavailable.body).toBe(503);
    expect(unavailable.json().error.code).toBe('EVIDENCE_SERVICE_UNAVAILABLE');
    expect((await appWithRuntime.inject({ method: 'GET', url: '/v1/merchants/onboarding/evidence/evd_unknown/download', headers: session('limited-token') })).statusCode).toBe(403);
  });

  it('releases only tenant-scoped clean bytes with safe headers after an audit write', async () => {
    const value = Buffer.from('%PDF-1.7\ntest download');
    const digest = (await import('node:crypto')).createHash('sha256').update(value).digest('hex');
    const reserved = await repository.reserve(evidence({ sizeBytes: value.length, sha256: digest }));
    objects.set(reserved.record.id, value);
    await repository.transition(reserved.record.id, 'm1', 'QUARANTINED', 'SCANNING', 'u1', { scanner: 'test-scanner' });
    await repository.transition(reserved.record.id, 'm1', 'SCANNING', 'CLEAN', 'u1', { scanner: 'test-scanner' });
    expect((await appWithRuntime.inject({ method: 'GET', url: `/v1/merchants/onboarding/evidence/${reserved.record.id}/download`, headers: session('two-token') })).statusCode).toBe(404);
    const response = await appWithRuntime.inject({ method: 'GET', url: `/v1/merchants/onboarding/evidence/${reserved.record.id}/download`, headers: session('one-token') });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.rawPayload).toEqual(value);
    expect(response.headers['cache-control']).toBe('no-store, private');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-disposition']).toMatch(/^attachment; filename="evidence-evd_[A-Za-z0-9_-]+\.pdf"$/);
    expect(Number((await db.query(`SELECT count(*) FROM audit_events WHERE action='ONBOARDING_EVIDENCE_DOWNLOAD_AUTHORIZED' AND resource_id=$1`, [reserved.record.id])).rows[0].count)).toBe(1);
  });
});
