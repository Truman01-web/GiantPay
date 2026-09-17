import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { OutboxWorker } from './outbox/outboxWorker.js';
import { MerchantWebhookPublisher, WebhookDeliveryWorker } from './developer/webhookWorker.js';
import { RedisRateLimitStore } from './rateLimit.js';
import { NotificationOutboxPublisher } from './notifications/service.js';
import { workerAllowed } from './operations/controls.js';
import { GracefulLifecycle,ShutdownCoordinator } from './operations/lifecycle.js';

// Configuration is reloaded whenever the development watcher restarts.
const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const rateLimits=config.REDIS_URL?await RedisRateLimitStore.connect(config.REDIS_URL):undefined;
let workerState=!config.OUTBOX_WORKER_ENABLED;
const app = await buildApp(config, db, undefined,()=>workerState,rateLimits);
const webhookPublisher=new MerchantWebhookPublisher(db,config.WEBHOOK_MAX_ATTEMPTS),notificationPublisher=new NotificationOutboxPublisher(db);
const outbox = config.OUTBOX_WORKER_ENABLED ? new OutboxWorker(db, {publish:async message=>{await webhookPublisher.publish(message);if(await workerAllowed(db,'NOTIFICATION_PROCESSING_PAUSED'))await notificationPublisher.publish(message);}}, config.OUTBOX_POLL_MS,()=>workerAllowed(db,'OUTBOX_PROCESSING_PAUSED')) : null;
const deliveries = config.OUTBOX_WORKER_ENABLED ? new WebhookDeliveryWorker(db,config,config.OUTBOX_POLL_MS,()=>workerAllowed(db,'WEBHOOK_DELIVERY_PAUSED')) : null;
outbox?.start();
deliveries?.start();
workerState=true;
const lifecycle=new GracefulLifecycle([{name:'outbox',stopClaims:()=>outbox?.stop(),close:async()=>{}},{name:'webhook',stopClaims:()=>deliveries?.stop(),close:async()=>{}},{name:'http',stopClaims:()=>{workerState=false;},close:()=>app.close()},{name:'redis',close:()=>rateLimits?.close()??Promise.resolve()},{name:'postgres',close:()=>db.end()}],config.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
const shutdownCoordinator=new ShutdownCoordinator(lifecycle,config.GRACEFUL_SHUTDOWN_TIMEOUT_MS+100);
const shutdown = (signal:'SIGINT'|'SIGTERM') => {void shutdownCoordinator.shutdown(signal).then(result=>{process.exitCode=result.timedOut?1:0;});};
process.on('SIGINT',()=>shutdown('SIGINT')); process.on('SIGTERM',()=>shutdown('SIGTERM'));
await app.listen({ host: config.HOST, port: config.PORT });
