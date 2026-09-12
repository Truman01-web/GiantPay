import { createHash } from 'node:crypto';
import { readdir,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Db } from './db.js';
import { transaction } from './db.js';

export const EXPECTED_MIGRATIONS=['001_initial.sql','002_refund_decisions.sql','003_refund_decider.sql','004_provider_webhooks.sql','005_ledger_outbox.sql','006_developer_platform.sql','007_security_hardening.sql'] as const;

export async function applyMigrations(db:Db,directory=resolve('migrations')) {
  const names=(await readdir(directory)).filter(x=>x.endsWith('.sql')).sort();
  if(JSON.stringify(names)!==JSON.stringify(EXPECTED_MIGRATIONS))throw new Error(`Expected migrations ${EXPECTED_MIGRATIONS.join(', ')}, found ${names.join(', ')}`);
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum char(64),applied_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum char(64)`);
  let applied=0;
  for(const name of names){const sql=await readFile(resolve(directory,name),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');await transaction(db,async client=>{await client.query(`SELECT pg_advisory_xact_lock(hashtext('giantpay_migrations'))`);const existing=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);if(existing.rowCount){if(existing.rows[0].checksum&&existing.rows[0].checksum!==checksum)throw new Error(`Applied migration changed: ${name}`);if(!existing.rows[0].checksum)await client.query('UPDATE schema_migrations SET checksum=$2 WHERE name=$1',[name,checksum]);return;}await client.query(sql);await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);applied++;});}
  return applied;
}
