// Real local API with disposable database state and synthetic identities only.
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import pg from 'pg';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { applyMigrations } from '../src/migrationRunner.js';
import { encryptSecret } from '../src/developer/webhookSecurity.js';
import { RedisRateLimitStore } from '../src/rateLimit.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const databaseUrl = requireSafeTestDatabase(process.env.TEST_DATABASE_URL).toString();
if (!process.env.TEST_REDIS_URL) throw new Error('Disposable Redis is required.');
const schema = `browser_acceptance_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Pool({ connectionString: databaseUrl });
await admin.query(`CREATE SCHEMA ${schema}`);
const db = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
await applyMigrations(db);
const pepper = 'p'.repeat(32), key = 'k'.repeat(32);
const passwordHash = await argon2.hash('Synthetic-browser-password-26!' + pepper);
await db.query(`INSERT INTO merchants(id,name) VALUES('browser-merchant','Browser Acceptance Merchant')`);
await db.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,email_verified_at)
  VALUES('browser-owner','browser-merchant','Browser Owner','owner@example.test','owner@example.test',$1,'OWNER',ARRAY['payments:read','payments.links:manage','onboarding:read','onboarding:write'],now())`, [passwordHash]);
await db.query(`INSERT INTO users(id,name,email,normalized_email,password_hash,role,permissions,email_verified_at,mfa_enabled,staff_profile,staff_provisioned_at,staff_provisioned_by)
  VALUES('browser-staff','Browser Staff','browser-review@giantplus-mw.com','browser-review@giantplus-mw.com',$1,'PLATFORM_ADMIN',ARRAY['platform.health.read','platform.operations.read'],now(),true,'OPERATIONS',now(),'synthetic-fixture')`, [passwordHash]);
await db.query('INSERT INTO mfa_enrollments(user_id,secret_ciphertext,verified_at) VALUES($1,$2,now())', ['browser-staff',encryptSecret('JBSWY3DPEHPK3PXP',key)]);
const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: databaseUrl, PASSWORD_PEPPER: pepper, COOKIE_SECRET: 'c'.repeat(32), WEBHOOK_SECRET_KEY: key, FRONTEND_ORIGIN: 'http://127.0.0.1:4187', STAFF_FRONTEND_ORIGIN: 'http://127.0.0.1:4188', PAYMENT_PROVIDER: 'sandbox', SANDBOX_WEBHOOK_SECRET: 's'.repeat(32), RATE_LIMIT_NAMESPACE: schema, EXTERNAL_DELIVERY_ENABLED: 'false', REAL_PAYOUTS_ENABLED: 'false' });
const limits = await RedisRateLimitStore.connect(process.env.TEST_REDIS_URL);
const app = await buildApp(config,db,undefined,undefined,limits);
await app.listen({ port: 4017, host: '127.0.0.1' });
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await app.close(); await db.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end();
}
process.on('SIGTERM', () => { void close(); });
process.on('SIGINT', () => { void close(); });
