import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import {
  SmtpRegistrationOtpDelivery,
  type SmtpSender,
} from '../src/smtpRegistrationOtp.js';

const config = loadConfig({
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://localhost/test',
  PASSWORD_PEPPER: 'p'.repeat(32),
  COOKIE_SECRET: 'c'.repeat(32),
  FRONTEND_ORIGIN: 'http://127.0.0.1:5173',
  PAYMENT_PROVIDER: 'sandbox',
  SANDBOX_WEBHOOK_SECRET: 'w'.repeat(32),
  EXTERNAL_DELIVERY_ENABLED: 'true',
  EMAIL_PROVIDER: 'smtp',
  SMTP_HOST: 'smtp.example.invalid',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'no-reply@giantpay.mw',
  SMTP_PASSWORD: 'protected-secret',
  SMTP_FROM: 'GiantPay <no-reply@giantpay.mw>',
  SMTP_TIMEOUT_MS: '1000',
});
const input = {
  challengeId: 'challenge-123',
  destination: 'merchant@example.invalid',
  code: '123456',
  expiresAt: '2030-01-01T00:10:00.000Z',
};

describe('SMTP registration OTP delivery', () => {
  it('builds the professional verification message and deduplicates a challenge', async () => {
    const messages: Parameters<SmtpSender>[0][] = [];
    const sender: SmtpSender = vi.fn(async (message) => {
      messages.push(message);
    });
    const delivery = new SmtpRegistrationOtpDelivery(config, sender);
    expect((await delivery.queue(input)).queued).toBe(true);
    expect((await delivery.queue(input)).queued).toBe(true);
    expect(sender).toHaveBeenCalledOnce();
    const message = messages[0]!;
    expect(message.to).toBe(input.destination);
    expect(message.text).toContain(input.code);
    expect(message.text).toContain(input.expiresAt);
    expect(message.text).toMatch(/Do not share/i);
    expect(message.text).toMatch(/did not request/i);
  });

  it('normalizes provider rejection without exposing provider details', async () => {
    const delivery = new SmtpRegistrationOtpDelivery(config, async () => {
      throw new Error('550 mailbox secret diagnostic');
    });
    const result = await delivery.queue(input);
    expect(result).toMatchObject({ queued: false, provider: 'smtp', failureCode: 'DELIVERY_REJECTED' });
    expect(JSON.stringify(result)).not.toContain('mailbox secret');
  });

  it('bounds delivery time and returns a safe timeout code', async () => {
    vi.useFakeTimers();
    try {
      const delivery = new SmtpRegistrationOtpDelivery(config, () => new Promise(() => undefined));
      const pending = delivery.queue(input);
      await vi.advanceTimersByTimeAsync(1000);
      await expect(pending).resolves.toMatchObject({ queued: false, failureCode: 'DELIVERY_TIMEOUT' });
    } finally {
      vi.useRealTimers();
    }
  });
});
