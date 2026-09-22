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
const productionBase={...base,DATABASE_URL:'postgres://database.invalid/giantpay?sslmode=verify-full'};

describe('configuration safety', () => {
  it('allows sandbox in development', () => {
    expect(loadConfig({ ...base, NODE_ENV: 'development' })).toMatchObject({ PAYMENT_PROVIDER: 'sandbox' });
  });

  it('blocks sandbox in production', () => {
    expect(() => loadConfig({ ...productionBase, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'true' })).toThrow(/forbidden/i);
  });

  it('fails closed for unsafe production and external-provider configuration', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'true' })).toThrow(/DATABASE_URL.*TLS/);
    expect(() => loadConfig({ ...productionBase, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'redis://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'true' })).toThrow(/TLS/);
    expect(() => loadConfig({ ...productionBase, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'http://app.invalid', COOKIE_SECURE:'true' })).toThrow(/HTTPS/);
    expect(() => loadConfig({ ...productionBase, NODE_ENV: 'production', WEBHOOK_SECRET_KEY:'k'.repeat(32), REDIS_URL:'rediss://cache.invalid', TRUSTED_PROXIES:'10.0.0.1', FRONTEND_ORIGIN:'https://app.invalid', COOKIE_SECURE:'false' })).toThrow(/COOKIE_SECURE/);
    expect(() => loadConfig({ ...base, NODE_ENV: 'test', EXTERNAL_DELIVERY_ENABLED:'true' })).toThrow();
    expect(() => loadConfig({ ...base, NODE_ENV: 'test', REAL_PAYOUTS_ENABLED:'true' })).toThrow();
  });

  it('accepts complete TLS SMTP configuration outside tests and rejects incomplete settings', () => {
    const smtp = {
      ...base,
      NODE_ENV: 'development',
      EXTERNAL_DELIVERY_ENABLED: 'true',
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.invalid',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'no-reply@giantpay.mw',
      SMTP_PASSWORD: 'protected-secret',
      SMTP_FROM: 'GiantPay <no-reply@giantpay.mw>',
    };
    expect(loadConfig(smtp)).toMatchObject({ EXTERNAL_DELIVERY_ENABLED: true, EMAIL_PROVIDER: 'smtp' });
    expect(() => loadConfig({ ...smtp, SMTP_PASSWORD: undefined })).toThrow(/complete SMTP/i);
    expect(() => loadConfig({ ...smtp, SMTP_SECURE: 'false' })).toThrow(/SMTP_SECURE/i);
    expect(() => loadConfig({ ...smtp, SMTP_FROM: 'Other <sender@example.invalid>' })).toThrow(/approved/i);
  });

  it('accepts explicit sandbox production SMTP configuration while retaining production safeguards', () => {
    expect(loadConfig({
      ...productionBase,
      NODE_ENV: 'production',
      DEPLOYMENT_ENVIRONMENT: 'sandbox',
      FRONTEND_ORIGIN: 'https://giantpay.mw',
      REDIS_URL: 'rediss://cache.invalid',
      TRUSTED_PROXIES: '10.0.0.1',
      COOKIE_SECURE: 'true',
      WEBHOOK_SECRET_KEY: 'k'.repeat(32),
      PASSWORD_PEPPER: 'pepper-value-not-repeated-1234567890',
      COOKIE_SECRET: 'cookie-value-not-repeated-1234567890',
      SANDBOX_WEBHOOK_SECRET: 'webhook-value-not-repeated-123456789',
      EXTERNAL_DELIVERY_ENABLED: 'true',
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.invalid',
      SMTP_SECURE: 'true',
      SMTP_USER: 'no-reply@giantpay.mw',
      SMTP_PASSWORD: 'protected-secret',
      SMTP_FROM: 'GiantPay <no-reply@giantpay.mw>',
    })).toMatchObject({ NODE_ENV: 'production', EXTERNAL_DELIVERY_ENABLED: true });
  });
});
