import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { OutboxWorker } from './outbox/outboxWorker.js';
import { MerchantWebhookPublisher, WebhookDeliveryWorker } from './developer/webhookWorker.js';
import { RedisRateLimitStore } from './rateLimit.js';
import { NotificationOutboxPublisher } from './notifications/service.js';

// Configuration is reloaded whenever the development watcher restarts.
const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const rateLimits=config.REDIS_URL?await RedisRateLimitStore.connect(config.REDIS_URL):undefined;
let workerState=!config.OUTBOX_WORKER_ENABLED;
const app = await buildApp(config, db, undefined,()=>workerState,rateLimits);
const webhookPublisher=new MerchantWebhookPublisher(db,config.WEBHOOK_MAX_ATTEMPTS),notificationPublisher=new NotificationOutboxPublisher(db);
const outbox = config.OUTBOX_WORKER_ENABLED ? new OutboxWorker(db, {publish:async message=>{await webhookPublisher.publish(message);await notificationPublisher.publish(message);}}, config.OUTBOX_POLL_MS) : null;
const deliveries = config.OUTBOX_WORKER_ENABLED ? new WebhookDeliveryWorker(db,config,config.OUTBOX_POLL_MS) : null;
outbox?.start();
deliveries?.start();
workerState=true;
let shuttingDown=false;
const shutdown = async () => { if(shuttingDown)return;shuttingDown=true;workerState=false;outbox?.stop(); deliveries?.stop(); await app.close(); await db.end(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
await app.listen({ host: config.HOST, port: config.PORT });
