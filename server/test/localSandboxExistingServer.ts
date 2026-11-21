// Reuse the explicitly selected disposable browser fixture without deleting its data.
import pg from 'pg';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { RedisRateLimitStore } from '../src/rateLimit.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = requireSafeTestDatabase(process.env.TEST_DATABASE_URL).toString();
const schema = process.env.SANDBOX_SCHEMA ?? '';
if (!/^browser_acceptance_[a-f0-9]{32}$/.test(schema) || !process.env.TEST_REDIS_URL) throw new Error('An existing disposable browser schema and Redis are required');
const db = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
const limits = await RedisRateLimitStore.connect(process.env.TEST_REDIS_URL);
const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: url, PASSWORD_PEPPER: 'p'.repeat(32), COOKIE_SECRET: 'c'.repeat(32), WEBHOOK_SECRET_KEY: 'k'.repeat(32), FRONTEND_ORIGIN: 'http://127.0.0.1:4189', STAFF_FRONTEND_ORIGIN: 'http://127.0.0.1:4188', PAYMENT_PROVIDER: 'sandbox', SANDBOX_WEBHOOK_SECRET: 's'.repeat(32), RATE_LIMIT_NAMESPACE: `${schema}:new`, EXTERNAL_DELIVERY_ENABLED: 'false', REAL_PAYOUTS_ENABLED: 'false' });
const app = await buildApp(config, db, undefined, undefined, limits);
await app.listen({ port: 4018, host: '127.0.0.1' });
process.on('SIGTERM', () => { void app.close().then(() => db.end()); });
process.on('SIGINT', () => { void app.close().then(() => db.end()); });
