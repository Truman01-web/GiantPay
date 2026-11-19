/**
 * OneKhusa push-payment webhook handler.
 *
 * OneKhusa sends a POST for each of pushpayment.success / pushpayment.failed
 * / pushpayment.reversed, identified by the X-OneKhusa-Webhook-Event header
 * and authenticated via X-OneKhusa-Webhook-Signature (HMAC-SHA512 over the
 * raw body, using a secret unique to that event). All three are registered
 * to the same callback URL and dispatched here by event header — confirmed
 * against real sandbox deliveries on 2026-11-18, see oneKhusaProvider.ts.
 *
 * Unlike Flutterwave, no mandatory re-verification call is needed: the
 * signature is a true HMAC bound to the exact payload, not a static shared
 * token, so a verified signature is sufficient proof of authenticity.
 */
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import type { RateLimitStore } from '../rateLimit.js';
import { rateLimit } from '../rateLimit.js';
import { apiError } from '../security.js';
import { WebhookVerificationError } from '../providers/sandboxProvider.js';
import { OneKhusaPaymentProvider } from '../providers/oneKhusaProvider.js';
import type { PaymentProvider, ProviderWebhookEvent } from '../providers/types.js';
import { processPaymentWebhook } from '../payments/webhookProcessor.js';
import { operationalControlGuard } from '../operations/controls.js';

export async function registerOneKhusaRoutes(
  app: FastifyInstance,
  config: Config,
  db: Db,
  rateLimits: RateLimitStore,
  provider: PaymentProvider,
) {
  // Only register this route if OneKhusa is the active provider.
  if (!(provider instanceof OneKhusaPaymentProvider)) return;

  const clientIp = (r: any) => r.ip;

  // ------------------------------------------------------------------
  // POST /v1/webhooks/providers/onekhusa
  //
  // Raw body is captured in the preParsing hook (registered in app.ts) —
  // this path MUST be added to that hook's isWebhook check or signature
  // verification will silently operate on a re-serialized body and fail.
  // ------------------------------------------------------------------
  app.post(
    '/v1/webhooks/providers/onekhusa',
    {
      bodyLimit: 64 * 1024,
      preHandler: [
        operationalControlGuard(db, 'WEBHOOK_DELIVERY_PAUSED'),
        rateLimit(rateLimits, config, 'onekhusa-webhook:ip', 200, 60, clientIp),
      ],
    },
    async (request, reply) => {
      const rawBody = (request as any).rawWebhookBody ?? Buffer.alloc(0);

      let webhookEvent: ProviderWebhookEvent;
      try {
        webhookEvent = provider.parseAndVerifyWebhook(rawBody, {
          signature:
            typeof request.headers['x-onekhusa-webhook-signature'] === 'string'
              ? request.headers['x-onekhusa-webhook-signature']
              : undefined,
          event:
            typeof request.headers['x-onekhusa-webhook-event'] === 'string'
              ? request.headers['x-onekhusa-webhook-event']
              : undefined,
        });
      } catch (error) {
        if (error instanceof WebhookVerificationError)
          return reply.code(error.statusCode).send(apiError(request, error.code, error.message));
        throw error;
      }

      const result = await processPaymentWebhook(db, provider.name, webhookEvent, rawBody);

      if (result.outcome === 'PROVIDER_MISMATCH')
        return reply.code(409).send(apiError(request, 'PROVIDER_MISMATCH', 'Payment provider does not match.'));
      if (result.outcome === 'PAYLOAD_CONFLICT')
        return reply.code(409).send(
          apiError(request, 'WEBHOOK_REPLAY_CONFLICT', 'Webhook event conflicts with a previous delivery.'),
        );
      if (result.outcome === 'UNKNOWN_PAYMENT')
        return reply.code(404).send(apiError(request, 'UNKNOWN_PAYMENT', 'Payment reference was not found.'));
      if (result.outcome === 'INVALID_TRANSITION')
        return reply.code(409).send(
          apiError(request, 'INVALID_PAYMENT_TRANSITION', 'Payment status transition was rejected.'),
        );

      return reply.code(202).send({ accepted: true, duplicate: result.outcome === 'DUPLICATE' });
    },
  );
}
