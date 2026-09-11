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
  PAYMENT_PROVIDER: z.enum(['sandbox']).default('sandbox'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(720).default(12),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const config = schema.parse(source);
  if (config.NODE_ENV === 'production' && config.PAYMENT_PROVIDER === 'sandbox') {
    throw new Error('PAYMENT_PROVIDER=sandbox is forbidden in production');
  }
  return config;
}
