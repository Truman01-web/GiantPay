/**
 * Flutterwave v3 webhook and redirect handler.
 *
 * Flutterwave sends a POST to your webhook URL for events such as
 * "charge.completed". The request is authenticated via the `verif-hash`
 * header, which must equal the Secret Hash configured in the Flutterwave
 * Dashboard (Settings → Webhooks). This is a direct string comparison —
 * NOT an HMAC over the body — but we still use timingSafeEqual to prevent
 * timing attacks.
 *
 * CRITICAL: The webhook is a notification only. Before confirming a payment
 * we MUST re-query GET /v3/transactions/{id}/verify and validate:
 *   • status === "successful"
 *   • currency matches our payment record exactly
 *   • amount matches our payment record to the tambala (exact integer)
 *   • tx_ref matches our paymentReference
 *
 * The redirect callback (customer returned from Flutterwave's hosted page)
 * must also be treated as a notification only. The frontend polls
 * /v1/payment-status/:reference to get the authoritative status.
 */
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import type { RateLimitStore } from '../rateLimit.js';
import { rateLimit } from '../rateLimit.js';
import { apiError } from '../security.js';
import { WebhookVerificationError } from '../providers/sandboxProvider.js';
import {
  FlutterwavePaymentProvider,
  FlutterwaveVerificationError,
} from '../providers/flutterwaveProvider.js';
import type { PaymentProvider, ProviderWebhookEvent } from '../providers/types.js';
import { processPaymentWebhook } from '../payments/webhookProcessor.js';
import { operationalControlGuard } from '../operations/controls.js';

import { z } from 'zod';

export async function registerFlutterwaveRoutes(
  app: FastifyInstance,
  config: Config,
  db: Db,
  rateLimits: RateLimitStore,
  provider: PaymentProvider,
) {
  // Only register these routes if Flutterwave is the active provider.
  // If sandbox is configured, these routes are not mounted at all.
  if (!(provider instanceof FlutterwavePaymentProvider)) return;

  const clientIp = (r: any) => r.ip;

  // ------------------------------------------------------------------
  // POST /v1/webhooks/providers/flutterwave
  //
  // Flutterwave sends charge.completed and other events here.
  // Capture raw body in preParsing hook (registered in app.ts).
  // Verify verif-hash, then re-query FLW to confirm before posting.
  // ------------------------------------------------------------------
  app.post(
    '/v1/webhooks/providers/flutterwave',
    {
      bodyLimit: 64 * 1024,
      preHandler: [
        operationalControlGuard(db, 'WEBHOOK_DELIVERY_PAUSED'),
        rateLimit(rateLimits, config, 'flw-webhook:ip', 200, 60, clientIp),
      ],
    },
    async (request, reply) => {
      const rawBody = (request as any).rawWebhookBody ?? Buffer.alloc(0);

      // Step 1 — Verify the verif-hash header.
      let webhookEvent: ProviderWebhookEvent;
      try {
        webhookEvent = provider.parseAndVerifyWebhook(rawBody, {
          verifHash:
            typeof request.headers['verif-hash'] === 'string'
              ? request.headers['verif-hash']
              : undefined,
        });
      } catch (error) {
        if (error instanceof WebhookVerificationError)
          return reply.code(error.statusCode).send(apiError(request, error.code, error.message));
        throw error;
      }

      // Step 2 — Re-query Flutterwave to verify amount, currency, reference.
      // The webhook event carries the Flutterwave numeric transaction ID as
      // providerPaymentId. We use it to call GET /v3/transactions/{id}/verify.
      const paymentRow = await db.query(
        'SELECT * FROM payments WHERE reference=$1',
        [webhookEvent.paymentReference],
      );
      if (!paymentRow.rowCount) {
        // Record but don't fail loudly — unknown payments are logged by webhookProcessor.
        const result = await processPaymentWebhook(db, provider.name, webhookEvent, rawBody);
        return reply.code(202).send({ accepted: true, duplicate: result.outcome === 'DUPLICATE' });
      }

      const payment = paymentRow.rows[0];

      if (payment.provider_name !== provider.name) {
        return reply.code(409).send(apiError(request, 'PROVIDER_MISMATCH', 'Payment provider does not match.'));
      }
      try {
        const verified = await provider.verifyTransactionAfterWebhook({
          flwTransactionId: webhookEvent.providerPaymentId,
          expectedTxRef: payment.reference,
          expectedAmountMinor: Number(payment.gross_minor),
          expectedCurrency: payment.currency,
        });
        // Do not consume an event while the outcome is uncertain.
        // Hosted checkout permits retries after failed payment attempts.
        if (verified.status !== 'SUCCEEDED') {
          return reply.code(503).send(apiError(request, 'VERIFY_PENDING', 'Payment verification is pending.'));
        }
        webhookEvent = { ...webhookEvent, status: verified.status };
      } catch (err) {
        request.log.warn({ paymentRef: payment.reference }, 'Flutterwave verification did not confirm payment.');
        const mismatch = err instanceof FlutterwaveVerificationError && err.code !== 'VERIFY_UNAVAILABLE';
        return reply.code(mismatch ? 409 : 503).send(apiError(request,
          mismatch ? 'VERIFICATION_MISMATCH' : 'VERIFY_UNAVAILABLE', 'Payment could not be verified.'));
      }

      // Step 3 — Process through normal webhook pipeline (dedup, state machine, ledger).
      const result = await processPaymentWebhook(db, provider.name, webhookEvent, rawBody);

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

  // ------------------------------------------------------------------
  // GET /v1/webhooks/providers/flutterwave/redirect
  //
  // Flutterwave redirects the customer here after they attempt payment
  // on the hosted page. This is a notification only — we do NOT trust
  // query parameters to confirm payment. We redirect the customer to
  // the frontend payment-status page, which polls the authoritative
  // backend status.
  //
  // Query params from Flutterwave: status, tx_ref, transaction_id
  // ------------------------------------------------------------------
  app.get(
    '/v1/webhooks/providers/flutterwave/redirect',
    { preHandler: [operationalControlGuard(db, 'WEBHOOK_DELIVERY_PAUSED'), rateLimit(rateLimits, config, 'flw-redirect:ip', 30, 60, clientIp)] },
    async (request, reply) => {
      const q = z.object({
        status: z.string().optional(),
        tx_ref: z.string().optional(),
        transaction_id: z.string().optional(),
      }).parse(request.query);

      // If we have a tx_ref, we can look up the payment reference.
      // Redirect to the frontend status page which will poll for the real status.
      const ref = q.tx_ref ?? 'unknown';
      if (q.tx_ref && q.transaction_id && /^[1-9][0-9]{0,15}$/.test(q.transaction_id)) {
        const payment = (await db.query('SELECT * FROM payments WHERE reference=$1 AND provider_name=$2', [ref, provider.name])).rows[0];
        if (payment) {
          try {
            const verified = await provider.verifyTransactionAfterWebhook({ flwTransactionId: q.transaction_id, expectedTxRef: ref, expectedAmountMinor: Number(payment.gross_minor), expectedCurrency: payment.currency });
            if (verified.status === 'SUCCEEDED') {
              const event: ProviderWebhookEvent = { eventId: `redirect:${verified.flwTransactionId}`, eventType: 'payment.status.changed', paymentReference: ref, providerPaymentId: verified.flwTransactionId, status: 'SUCCEEDED', occurredAt: new Date().toISOString() };
              await processPaymentWebhook(db, provider.name, event, Buffer.from(JSON.stringify({ transactionId: verified.flwTransactionId, reference: ref })));
            }
          } catch {
            request.log.warn({ paymentRef: ref }, 'Redirect verification did not confirm payment; reconciliation required.');
          }
        }
      }

      // Never trust q.status — the frontend must re-fetch from /v1/payment-status/:ref.
      return reply.redirect(
        `${config.FRONTEND_ORIGIN}/payment/${encodeURIComponent(ref)}?source=redirect`,
        302,
      );
    },
  );
}
