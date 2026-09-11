import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDb, transaction } from './db.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
try {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir(resolve('migrations'))).filter((x) => x.endsWith('.sql')).sort()) {
    const exists = await db.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
    if (exists.rowCount) continue;
    const sql = await readFile(resolve('migrations', name), 'utf8');
    try {
      await transaction(db, async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      });
      console.log(`Applied ${name}`);
    } catch (error) {
      throw error;
    }
  }
} finally {
  await db.end();
}
