import { randomUUID } from 'node:crypto';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { MerchantWebhookPublisher, WebhookDeliveryWorker } from './developer/webhookWorker.js';
import { NotificationDeliveryWorker, NotificationOutboxPublisher } from './notifications/service.js';
import { workerAllowed } from './operations/controls.js';
import { GracefulLifecycle, ShutdownCoordinator } from './operations/lifecycle.js';
import { OutboxWorker } from './outbox/outboxWorker.js';

type WorkerRole = 'outbox' | 'webhook' | 'notification' | 'reconciliation';
const role = process.env.WORKER_ROLE as WorkerRole;
if (!['outbox', 'webhook', 'notification', 'reconciliation'].includes(role)) throw new Error('WORKER_ROLE must be outbox, webhook, notification, or reconciliation');
const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const workerId = `${role}-${randomUUID()}`;
let stopped = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const webhookPublisher = new MerchantWebhookPublisher(db, config.WEBHOOK_MAX_ATTEMPTS);
const notificationPublisher = new NotificationOutboxPublisher(db);
const outbox = new OutboxWorker(db, { publish: async message => { await webhookPublisher.publish(message); if (await workerAllowed(db, 'NOTIFICATION_PROCESSING_PAUSED')) await notificationPublisher.publish(message); } }, config.OUTBOX_POLL_MS, () => workerAllowed(db, 'OUTBOX_PROCESSING_PAUSED'));
const webhook = new WebhookDeliveryWorker(db, config, config.OUTBOX_POLL_MS, () => workerAllowed(db, 'WEBHOOK_DELIVERY_PAUSED'));
const notifications = new NotificationDeliveryWorker(db, config.WORKER_LEASE_SECONDS, () => workerAllowed(db, 'NOTIFICATION_PROCESSING_PAUSED'));

const notificationTick = async () => {
  if (stopped) return;
  const jobs = await notifications.claim(workerId, config.WORKER_BATCH_SIZE);
  for (const job of jobs) await notifications.finishDisabled(job.id, workerId);
  if (!stopped) timer = setTimeout(() => void notificationTick(), config.OUTBOX_POLL_MS);
};
const reconciliationTick = async () => {
  if (stopped) return;
  // Phase 3 reconciliation is request-driven. This worker performs a bounded,
  // read-only stale-run observation and never creates settlements or payouts.
  await db.query(`SELECT count(*) FROM reconciliation_runs WHERE status='RUNNING' AND started_at < now()-interval '15 minutes'`);
  if (!stopped) timer = setTimeout(() => void reconciliationTick(), config.OUTBOX_POLL_MS);
};
if (role === 'outbox') outbox.start();
if (role === 'webhook') webhook.start();
if (role === 'notification') void notificationTick();
if (role === 'reconciliation') void reconciliationTick();

const lifecycle = new GracefulLifecycle([{ name: role, stopClaims: () => { stopped = true; if (timer) clearTimeout(timer); outbox.stop(); webhook.stop(); }, close: async () => {} }, { name: 'postgres', close: () => db.end() }], config.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
const coordinator = new ShutdownCoordinator(lifecycle, config.GRACEFUL_SHUTDOWN_TIMEOUT_MS + 100);
const shutdown = (signal: 'SIGINT' | 'SIGTERM') => { void coordinator.shutdown(signal).then(result => { process.exitCode = result.timedOut ? 1 : 0; }); };
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
