import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { applyMigrations } from './migrationRunner.js';
import { runMigrationGate } from './release/migrationGate.js';

const command = process.argv[2];
if (command !== 'api' && command !== 'worker') throw new Error('Usage: launch <api|worker>');
await runMigrationGate(async () => {
  const config = loadConfig();
  const db = createDb(config.DATABASE_URL);
  try { await applyMigrations(db); } finally { await db.end(); }
}, async () => { await import(command === 'api' ? './api.js' : './worker.js'); });
