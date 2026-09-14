import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { PAYMENT_STATUSES } from '../payments/paymentState.js';
import type { InitiatePaymentInput, PaymentProvider, ProviderPaymentResult, ProviderPaymentStatus, ProviderWebhookEvent, WebhookHeaders } from './types.js';

export class WebhookVerificationError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number, message: string) {
    super(message);
  }
}

const eventSchema = z.object({
  eventId: z.string().min(1).max(200),
  eventType: z.literal('payment.status.changed'),
  paymentReference: z.string().min(1).max(200),
  providerPaymentId: z.string().min(1).max(200),
  status: z.enum(PAYMENT_STATUSES),
  occurredAt: z.iso.datetime(),
}).strict();

export function sandboxSignature(secret: string, timestamp: string, rawBody: Buffer): string {
  return createHmac('sha256', secret).update(timestamp).update('.').update(rawBody).digest('hex');
}

export function payloadHash(rawBody: Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = 'sandbox';

  constructor(
    private readonly secret: string,
    private readonly toleranceSeconds: number,
    nodeEnv: 'development' | 'test' | 'production',
  ) {
    if (nodeEnv === 'production') throw new Error('Sandbox payment provider is forbidden in production');
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<ProviderPaymentResult> {
    return { providerPaymentId: `sbx_${createHash('sha256').update(input.paymentReference).digest('hex').slice(0, 24)}`, status: 'PROCESSING' };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    return { providerPaymentId, status: 'PROCESSING' };
  }

  parseAndVerifyWebhook(rawBody: Buffer, headers: WebhookHeaders, now = new Date()): ProviderWebhookEvent {
    if (!headers.timestamp) throw new WebhookVerificationError('MISSING_TIMESTAMP', 401, 'Webhook timestamp is required.');
    if (!headers.signature) throw new WebhookVerificationError('MISSING_SIGNATURE', 401, 'Webhook signature is required.');
    if (!/^\d{10}$/.test(headers.timestamp)) throw new WebhookVerificationError('INVALID_TIMESTAMP', 401, 'Webhook timestamp is invalid.');
    const timestampMs = Number(headers.timestamp) * 1000;
    if (Math.abs(now.getTime() - timestampMs) > this.toleranceSeconds * 1000) {
      throw new WebhookVerificationError('STALE_WEBHOOK', 401, 'Webhook timestamp is outside the allowed window.');
    }
    const expected = Buffer.from(sandboxSignature(this.secret, headers.timestamp, rawBody), 'hex');
    let received: Buffer;
    try { received = Buffer.from(headers.signature, 'hex'); }
    catch { throw new WebhookVerificationError('INVALID_SIGNATURE', 401, 'Webhook signature is invalid.'); }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new WebhookVerificationError('INVALID_SIGNATURE', 401, 'Webhook signature is invalid.');
    }
    let parsed: unknown;
    try { parsed = JSON.parse(rawBody.toString('utf8')); }
    catch { throw new WebhookVerificationError('MALFORMED_PAYLOAD', 422, 'Webhook payload must be valid JSON.'); }
    const result = eventSchema.safeParse(parsed);
    if (!result.success) throw new WebhookVerificationError('INVALID_PAYLOAD', 422, 'Webhook payload is invalid.');
    return result.data;
  }

  async initiateRefund(): Promise<never> {
    throw new Error('Provider refund execution is disabled');
  }
}
