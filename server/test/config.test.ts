import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = {
  DATABASE_URL: 'postgres://localhost/test',
  PASSWORD_PEPPER: 'p'.repeat(32),
  COOKIE_SECRET: 'c'.repeat(32),
  FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
  PAYMENT_PROVIDER: 'sandbox',
  SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32),
};

describe('configuration safety', () => {
  it('allows sandbox in development', () => {
    expect(loadConfig({ ...base, NODE_ENV: 'development' })).toMatchObject({ PAYMENT_PROVIDER: 'sandbox' });
  });

  it('blocks sandbox in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(/forbidden/i);
  });
});
