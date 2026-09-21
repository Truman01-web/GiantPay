import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { assertSeedingAllowed } from '../src/seedGuard.js';

const base = {
  DATABASE_URL: 'postgres://localhost/test',
  PASSWORD_PEPPER: 'p'.repeat(32),
  COOKIE_SECRET: 'c'.repeat(32),
  FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
  PAYMENT_PROVIDER: 'sandbox',
  SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32),
};

describe('database seed guard', () => {
  it('allows isolated development and rejects production deployment', () => {
    const development = loadConfig({ ...base, NODE_ENV: 'development' });
    expect(() => assertSeedingAllowed(development)).not.toThrow();
    const production = { ...development, DEPLOYMENT_ENVIRONMENT: 'production' as const };
    expect(() => assertSeedingAllowed(production)).toThrow(/forbidden in production/i);
  });
});
