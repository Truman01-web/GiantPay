import { describe, expect, it } from 'vitest';
import { SandboxPaymentProvider, WebhookVerificationError, sandboxSignature } from '../src/providers/sandboxProvider.js';

const secret = 'sandbox-webhook-secret-for-tests-123';
const now = new Date('2026-09-11T12:00:00.000Z');
const timestamp = String(Math.floor(now.getTime() / 1000));
const payload = Buffer.from(JSON.stringify({
  eventId: 'evt_1',
  eventType: 'payment.status.changed',
  paymentReference: 'GP-1',
  providerPaymentId: 'sbx_1',
  status: 'SUCCEEDED',
  occurredAt: now.toISOString(),
}));

function provider() { return new SandboxPaymentProvider(secret, 300, 'test'); }

describe('sandbox provider', () => {
  it('returns repeatable initiation identifiers', async () => {
    const input = { paymentReference: 'GP-1', amountMinor: 1000, currency: 'MWK', channel: 'MOBILE_MONEY' as const, customer: {} };
    expect(await provider().initiatePayment(input)).toEqual(await provider().initiatePayment(input));
  });

  it('accepts a valid signature', () => {
    const event = provider().parseAndVerifyWebhook(payload, { timestamp, signature: sandboxSignature(secret, timestamp, payload) }, now);
    expect(event.status).toBe('SUCCEEDED');
  });

  it.each([
    ['missing signature', { timestamp }, 'MISSING_SIGNATURE'],
    ['invalid signature', { timestamp, signature: '00'.repeat(32) }, 'INVALID_SIGNATURE'],
    ['missing timestamp', { signature: '00'.repeat(32) }, 'MISSING_TIMESTAMP'],
  ])('rejects %s', (_label, headers, code) => {
    expect(() => provider().parseAndVerifyWebhook(payload, headers, now)).toThrowError(expect.objectContaining({ code }));
  });

  it('rejects an expired timestamp', () => {
    const stale = String(Number(timestamp) - 301);
    expect(() => provider().parseAndVerifyWebhook(payload, { timestamp: stale, signature: sandboxSignature(secret, stale, payload) }, now))
      .toThrowError(expect.objectContaining({ code: 'STALE_WEBHOOK' }));
  });

  it('rejects malformed and schema-invalid payloads', () => {
    const malformed = Buffer.from('{');
    expect(() => provider().parseAndVerifyWebhook(malformed, { timestamp, signature: sandboxSignature(secret, timestamp, malformed) }, now))
      .toThrowError(expect.objectContaining({ code: 'MALFORMED_PAYLOAD' }));
    const invalid = Buffer.from('{}');
    expect(() => provider().parseAndVerifyWebhook(invalid, { timestamp, signature: sandboxSignature(secret, timestamp, invalid) }, now))
      .toThrowError(WebhookVerificationError);
  });

  it('cannot be constructed in production', () => {
    expect(() => new SandboxPaymentProvider(secret, 300, 'production')).toThrow(/forbidden/i);
  });

  it('keeps refund execution disabled', async () => {
    await expect(provider().initiateRefund()).rejects.toThrow(/disabled/i);
  });
});
