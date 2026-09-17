import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { GracefulLifecycle, ShutdownCoordinator } from './operations/lifecycle.js';
import { RedisRateLimitStore } from './rateLimit.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const rateLimits = config.REDIS_URL ? await RedisRateLimitStore.connect(config.REDIS_URL) : undefined;
let accepting = true;
const app = await buildApp(config, db, undefined, () => accepting, rateLimits);
const lifecycle = new GracefulLifecycle([
  { name: 'http', stopClaims: () => { accepting = false; }, close: () => app.close() },
  { name: 'redis', close: () => rateLimits?.close() ?? Promise.resolve() },
  { name: 'postgres', close: () => db.end() },
], config.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
const coordinator = new ShutdownCoordinator(lifecycle, config.GRACEFUL_SHUTDOWN_TIMEOUT_MS + 100);
const shutdown = (signal: 'SIGINT' | 'SIGTERM') => { void coordinator.shutdown(signal).then(result => { process.exitCode = result.timedOut ? 1 : 0; }); };
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
await app.listen({ host: config.HOST, port: config.PORT });
