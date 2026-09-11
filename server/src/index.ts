import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { InternalOutboxPublisher, OutboxWorker } from './outbox/outboxWorker.js';

// Configuration is reloaded whenever the development watcher restarts.
const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const app = await buildApp(config, db);
const outbox = config.OUTBOX_WORKER_ENABLED ? new OutboxWorker(db, new InternalOutboxPublisher(), config.OUTBOX_POLL_MS) : null;
outbox?.start();
const shutdown = async () => { outbox?.stop(); await app.close(); await db.end(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
await app.listen({ host: config.HOST, port: config.PORT });
