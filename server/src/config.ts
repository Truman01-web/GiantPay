import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  PASSWORD_PEPPER: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  FRONTEND_ORIGIN: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  TRUSTED_PROXIES: z.string().default(''),
  COOKIE_SECURE: z.enum(['true','false']).optional().transform((value) => value === 'true'),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  RATE_LIMIT_NAMESPACE: z.string().regex(/^[A-Za-z0-9:_-]+$/).default('giantpay:rate-limit'),
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_GENERAL_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  PAYMENT_PROVIDER: z.enum(['sandbox']).default('sandbox'),
  SANDBOX_WEBHOOK_SECRET: z.string().min(32),
  WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().max(900).default(300),
  OUTBOX_WORKER_ENABLED: z.enum(['true','false']).default('false').transform((value) => value === 'true'),
  OUTBOX_POLL_MS: z.coerce.number().int().min(100).max(60_000).default(1000),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(720).default(12),
  WEBHOOK_SECRET_KEY: z.string().min(32).optional(),
  WEBHOOK_ALLOW_HTTP_DEVELOPMENT: z.enum(['true','false']).default('false').transform(v=>v==='true'),
  WEBHOOK_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5000),
  WEBHOOK_MAX_RESPONSE_BYTES: z.coerce.number().int().min(1024).max(65536).default(8192),
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(8),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const config = schema.parse(source);
  if (config.NODE_ENV === 'production' && (!config.WEBHOOK_SECRET_KEY || config.WEBHOOK_ALLOW_HTTP_DEVELOPMENT)) throw new Error('Production webhook secret key and HTTPS-only mode are required');
  if (config.NODE_ENV === 'production' && (!config.REDIS_URL || !config.REDIS_URL.startsWith('rediss://'))) throw new Error('REDIS_URL must use TLS in production');
  if (config.NODE_ENV === 'production' && !config.TRUSTED_PROXIES.trim()) throw new Error('TRUSTED_PROXIES is required in production');
  if (config.NODE_ENV === 'production' && config.COOKIE_SECURE === false) throw new Error('COOKIE_SECURE must not be false in production');
  if (config.NODE_ENV === 'production' && new URL(config.FRONTEND_ORIGIN).protocol !== 'https:') throw new Error('FRONTEND_ORIGIN must use HTTPS in production');
  if (config.NODE_ENV === 'production' && config.PAYMENT_PROVIDER === 'sandbox') throw new Error('PAYMENT_PROVIDER=sandbox is forbidden in production');
  return config;
}
