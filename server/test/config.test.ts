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
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'true' })).toThrow(/forbidden/i);
  });

  it('fails closed for unsafe production and external-provider configuration', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'redis://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'true' })).toThrow(/TLS/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'http://app.invalid', COOKIE_SECURE:'true' })).toThrow(/HTTPS/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'false' })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'test', EXTERNAL_DELIVERY_ENABLED:'true' })).toThrow();
    expect(() => loadConfig({ ...base, NODE_ENV: 'test', REAL_PAYOUTS_ENABLED:'true' })).toThrow();
  });
});
