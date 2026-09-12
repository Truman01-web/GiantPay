import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { OutboxWorker } from './outbox/outboxWorker.js';
import { MerchantWebhookPublisher, WebhookDeliveryWorker } from './developer/webhookWorker.js';

// Configuration is reloaded whenever the development watcher restarts.
const config = loadConfig();
const db = createDb(config.DATABASE_URL);
let workerState=!config.OUTBOX_WORKER_ENABLED;
const app = await buildApp(config, db, undefined,()=>workerState);
const outbox = config.OUTBOX_WORKER_ENABLED ? new OutboxWorker(db, new MerchantWebhookPublisher(db,config.WEBHOOK_MAX_ATTEMPTS), config.OUTBOX_POLL_MS) : null;
const deliveries = config.OUTBOX_WORKER_ENABLED ? new WebhookDeliveryWorker(db,config,config.OUTBOX_POLL_MS) : null;
outbox?.start();
deliveries?.start();
workerState=true;
const shutdown = async () => { workerState=false; outbox?.stop(); deliveries?.stop(); await app.close(); await db.end(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
await app.listen({ host: config.HOST, port: config.PORT });
