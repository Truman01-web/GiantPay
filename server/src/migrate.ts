import { createDb } from './db.js';
import { loadConfig } from './config.js';
import { applyMigrations } from './migrationRunner.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
try {
  const applied=await applyMigrations(db);
  console.log(`Applied ${applied} migration(s)`);
} finally {
  await db.end();
}
