import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const app = await buildApp(config, db);
const shutdown = async () => { await app.close(); await db.end(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
await app.listen({ host: config.HOST, port: config.PORT });
