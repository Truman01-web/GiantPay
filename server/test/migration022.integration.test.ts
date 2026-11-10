import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations, EXPECTED_MIGRATIONS } from '../src/migrationRunner.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const url = process.env.TEST_DATABASE_URL ? requireSafeTestDatabase(process.env.TEST_DATABASE_URL).toString() : undefined;
const suite = url ? describe : describe.skip;
const schemas: string[] = [];
let admin: pg.Pool;
suite('migration 022 upgrade and repeat safety', () => {
  beforeAll(() => { admin = new pg.Pool({ connectionString: url }); });
  afterAll(async () => { for (const schema of schemas) await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); });
  async function database() {
    const schema = `migration022_${randomUUID().replaceAll('-', '')}`;
    schemas.push(schema);
    await admin.query(`CREATE SCHEMA ${schema}`);
    return new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  }
  it('installs all migrations on an empty schema and records each once on repeat', async () => {
    const db = await database();
    try {
      expect(await applyMigrations(db)).toBe(22);
      expect(await applyMigrations(db)).toBe(0);
      expect((await db.query('SELECT count(*)::int n FROM schema_migrations')).rows[0].n).toBe(22);
    } finally { await db.end(); }
  });
  it('upgrades a recorded 021 schema without changing its payment or retry record and repeats safely', async () => {
    const db = await database();
    try {
      await db.query('CREATE TABLE schema_migrations(name text PRIMARY KEY,checksum char(64),applied_at timestamptz NOT NULL DEFAULT now())');
      for (const name of EXPECTED_MIGRATIONS.slice(0, 21)) {
        const sql = await readFile(resolve('migrations', name), 'utf8');
        await db.query(sql);
        await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name,createHash('sha256').update(sql).digest('hex')]);
      }
      await db.query(`INSERT INTO merchants(id,name) VALUES('legacy','Legacy Merchant'); INSERT INTO payments(id,merchant_id,reference,status,channel,gross_minor,currency) VALUES('legacy-payment','legacy','GP-legacy','PROCESSING','CARD',1000,'MWK'); INSERT INTO idempotency_keys VALUES('legacy','checkout','legacy-retry',202,'{"reference":"GP-legacy"}')`);
      expect(await applyMigrations(db)).toBe(1);
      expect(await applyMigrations(db)).toBe(0);
      const sql = await readFile(resolve('migrations','022_flutterwave_scan_to_pay.sql'), 'utf8');
      await db.query(sql);
      expect((await db.query('SELECT reference,status,provider_transaction_id,provider_checkout_url FROM payments')).rows[0]).toEqual({ reference: 'GP-legacy', status: 'PROCESSING', provider_transaction_id: null, provider_checkout_url: null });
      expect((await db.query('SELECT response_body FROM idempotency_keys')).rows[0].response_body).toEqual({ reference: 'GP-legacy' });
      expect((await db.query('SELECT count(*)::int n FROM schema_migrations')).rows[0].n).toBe(22);
    } finally { await db.end(); }
  });
});
