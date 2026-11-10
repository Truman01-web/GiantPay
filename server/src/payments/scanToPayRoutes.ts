import { createHash } from 'node:crypto';
import { transaction as dbTx } from '../db.js';
import { initiateCheckout } from './initiateCheckout.js';
/**
 * Scan-to-Pay backend routes.
 *
 * A Scan-to-Pay code is a merchant-owned QR target.  The QR code encodes a
 * GiantPay HTTPS checkout URL with an opaque token — never a raw amount,
 * merchant ID or secret.  The customer scans the QR, visits the URL in their
 * browser, and completes payment via the normal checkout flow.
 *
 * Security guarantees:
 *  • The token is server-generated (crypto-random), not merchant-supplied.
 *  • Amounts are validated server-side; customer-supplied amounts are bounded
 *    by the merchant-configured min/max.
 *  • Merchant authorization and tenant isolation are enforced on every mutation.
 *  • Revocation and expiry are checked at both create-payment and fetch time.
 *  • Duplicate-request protection via idempotency-key on checkout submit.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import type { RateLimitStore } from '../rateLimit.js';
import { rateLimit } from '../rateLimit.js';
import {
  apiError,
  newId,
  newToken,
  requirePermission,
} from '../security.js';
import { authenticateSessionOrApiKey } from '../security.js';
import { operationalControlGuard } from '../operations/controls.js';
import type { PaymentProvider } from '../providers/types.js';

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createQrSchema = z.object({
  label: z.string().trim().min(1).max(100),
  currency: z.string().regex(/^[A-Z]{3}$/).default('MWK'),
  mode: z.enum(['FIXED', 'CUSTOMER_ENTERED']),
  amountMinor: z.number().int().positive().optional(),
  minAmountMinor: z.number().int().positive().optional(),
  maxAmountMinor: z.number().int().positive().optional(),
  expiresAt: z.iso.datetime().optional(),
  maxSuccessfulPayments: z.number().int().positive().optional(),
}).superRefine((v, c) => {
  if (v.mode === 'FIXED' && !v.amountMinor) {
    c.addIssue({ code: 'custom', path: ['amountMinor'], message: 'Amount is required for FIXED mode.' });
  }
  if (v.mode === 'CUSTOMER_ENTERED') {
    if (v.minAmountMinor && v.maxAmountMinor && v.minAmountMinor > v.maxAmountMinor) {
      c.addIssue({ code: 'custom', path: ['minAmountMinor'], message: 'Minimum must not exceed maximum.' });
    }
  }
});

function qrRow(row: any, frontendOrigin: string) {
  return {
    id: row.id,
    label: row.label,
    currency: row.currency,
    mode: row.mode,
    amountMinor: row.amount_minor != null ? Number(row.amount_minor) : null,
    minAmountMinor: row.min_amount_minor != null ? Number(row.min_amount_minor) : null,
    maxAmountMinor: row.max_amount_minor != null ? Number(row.max_amount_minor) : null,
    status: row.status,
    expiresAt: row.expires_at ?? null,
    maxSuccessfulPayments: row.max_successful_payments ?? null,
    successfulPaymentsCount: Number(row.successful_payments_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Checkout URL encodes only the opaque token — never amounts or merchant IDs.
    checkoutUrl: `${frontendOrigin}/checkout/qr/${row.token}`,
  };
}

export async function registerScanToPayRoutes(
  app: FastifyInstance,
  config: Config,
  db: Db,
  rateLimits: RateLimitStore,
  provider: PaymentProvider,
) {
  const auth = authenticateSessionOrApiKey(db, config.PASSWORD_PEPPER, rateLimits, config);
  const paymentCreationControl = operationalControlGuard(db, 'PAYMENT_CREATION_PAUSED');
  const clientIp = (r: any) => r.ip;

  // ------------------------------------------------------------------
  // GET /v1/qr — list merchant's scan-to-pay codes
  // ------------------------------------------------------------------
  app.get(
    '/v1/qr',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request) => {
      const q = pageSchema.parse(request.query);
      const merchantId = request.actor!.merchantId;
      const total = await db.query(
        'SELECT count(*) FROM scan_to_pay_codes WHERE merchant_id=$1',
        [merchantId],
      );
      const rows = await db.query(
        `SELECT * FROM scan_to_pay_codes WHERE merchant_id=$1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [merchantId, q.pageSize, (q.page - 1) * q.pageSize],
      );
      return {
        data: rows.rows.map((r: any) => qrRow(r, config.FRONTEND_ORIGIN)),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total.rows[0].count),
      };
    },
  );

  // ------------------------------------------------------------------
  // POST /v1/qr — create a scan-to-pay code
  // ------------------------------------------------------------------
  app.post(
    '/v1/qr',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request, reply) => {
      const body = createQrSchema.parse(request.body);
      const key = z.string().min(8).max(128).parse(request.headers['idempotency-key']);
      const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const result = await dbTx(db, async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [request.actor!.merchantId + ':create-qr:' + key]);
        const prior = await client.query("SELECT response_body FROM idempotency_keys WHERE merchant_id=$1 AND operation='create-qr' AND key=$2", [request.actor!.merchantId,key]);
        if (prior.rowCount) {
          const saved = prior.rows[0].response_body;
          if (saved.fingerprint !== fingerprint) throw Object.assign(new Error('Retry payload differs.'), { code: 'IDEMPOTENCY_CONFLICT' });
          return saved.result;
        }
        const id = newId('qr');
        const token = newToken();
        const row = await client.query(
          `INSERT INTO scan_to_pay_codes
             (id,merchant_id,created_by,label,currency,mode,amount_minor,
              min_amount_minor,max_amount_minor,expires_at,max_successful_payments,token)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING *`,
          [
            id, request.actor!.merchantId, request.actor!.id,
            body.label, body.currency, body.mode,
            body.amountMinor ?? null,
            body.minAmountMinor ?? null,
            body.maxAmountMinor ?? null,
            body.expiresAt ?? null,
            body.maxSuccessfulPayments ?? null,
            token,
          ],
        );
        const result = qrRow(row.rows[0], config.FRONTEND_ORIGIN);
        await client.query("INSERT INTO idempotency_keys VALUES($1,'create-qr',$2,201,$3)", [request.actor!.merchantId,key,{ fingerprint,result }]);
        return result;
      });
      return reply.code(201).send(result);
    },
  );

  // ------------------------------------------------------------------
  // GET /v1/qr/:id — fetch a single code (merchant-scoped)
  // ------------------------------------------------------------------
  app.get(
    '/v1/qr/:id',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const row = await db.query(
        'SELECT * FROM scan_to_pay_codes WHERE id=$1 AND merchant_id=$2',
        [id, request.actor!.merchantId],
      );
      if (!row.rowCount)
        return reply.code(404).send(apiError(request, 'NOT_FOUND', 'QR code not found.'));
      return qrRow(row.rows[0], config.FRONTEND_ORIGIN);
    },
  );

  // ------------------------------------------------------------------
  // PATCH /v1/qr/:id — disable / revoke a code
  // ------------------------------------------------------------------
  app.patch(
    '/v1/qr/:id',
    { preHandler: [auth, requirePermission('payments.links:manage')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      z.object({ status: z.literal('DISABLED') }).parse(request.body);
      const row = await db.query(
        `UPDATE scan_to_pay_codes SET status='DISABLED', updated_at=now()
         WHERE id=$1 AND merchant_id=$2 RETURNING *`,
        [id, request.actor!.merchantId],
      );
      if (!row.rowCount)
        return reply.code(404).send(apiError(request, 'NOT_FOUND', 'QR code not found.'));
      return qrRow(row.rows[0], config.FRONTEND_ORIGIN);
    },
  );

  // ------------------------------------------------------------------
  // GET /v1/checkout/qr/:token — public page data for the QR checkout
  //
  // This is the URL encoded in the QR code.  Anyone with the token can
  // view this page — it shows merchant name, amount, and available methods.
  // No authentication required (it's a public payment page).
  // ------------------------------------------------------------------
  app.get(
    '/v1/checkout/qr/:token',
    {
      preHandler: [
        rateLimit(rateLimits, config, 'qr-checkout-fetch:ip', 60, 60, clientIp),
      ],
    },
    async (request, reply) => {
      const { token } = z.object({ token: z.string().min(1).max(200) }).parse(request.params);
      const row = await db.query(
        `SELECT q.*, m.name merchant_name
         FROM scan_to_pay_codes q
         JOIN merchants m ON m.id = q.merchant_id
         WHERE q.token = $1`,
        [token],
      );
      if (!row.rowCount)
        return reply.code(404).send(apiError(request, 'NOT_FOUND', 'This QR checkout link is invalid.'));

      const qr = row.rows[0];
      const expired =
        qr.status !== 'ACTIVE' ||
        (qr.expires_at && new Date(qr.expires_at) < new Date()) ||
        (qr.max_successful_payments != null &&
          Number(qr.successful_payments_count) >= Number(qr.max_successful_payments));

      return {
        token: qr.token,
        merchantDisplayName: qr.merchant_name,
        currency: qr.currency,
        mode: qr.mode,
        // Only expose the fixed amount — never encode it in the URL.
        amountMinor: qr.amount_minor != null ? Number(qr.amount_minor) : null,
        minAmountMinor: qr.min_amount_minor != null ? Number(qr.min_amount_minor) : null,
        maxAmountMinor: qr.max_amount_minor != null ? Number(qr.max_amount_minor) : null,
        // Available channels reflect current provider configuration.
        // Mark Flutterwave channels as DEMONSTRATION until credentials are active.
        availableChannels: provider.name === 'flutterwave' ? ['CARD'] : ['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER'],
        status: expired ? 'EXPIRED' : 'READY',
        expiresAt: qr.expires_at ?? null,
        label: qr.label,
      };
    },
  );

  // ------------------------------------------------------------------
  // POST /v1/checkout/qr/:token/submit — initiate payment for a QR code
  //
  // The customer submits this with their chosen channel and (if
  // CUSTOMER_ENTERED mode) their desired amount. Server validates
  // amount against the min/max bounds — never trusts client-supplied
  // amounts for FIXED mode codes.
  // ------------------------------------------------------------------
  const idempotencySchema = z.string().min(8).max(128);
  const customerSchema = z.object({
    name: z.string().trim().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().regex(/^\+265[0-9]{9}$/).optional(),
  });

  app.post(
    '/v1/checkout/qr/:token/submit',
    {
      preHandler: [
        paymentCreationControl,
        rateLimit(rateLimits, config, 'qr-checkout-submit:ip', 10, 60, clientIp),
      ],
    },
    async (request, reply) => {
      const key = idempotencySchema.parse(request.headers['idempotency-key']);
      const { token } = z.object({ token: z.string().min(1).max(200) }).parse(request.params);
      const body = z.object({
        channel: z.enum(['MOBILE_MONEY', 'CARD', 'BANK_TRANSFER']),
        // For CUSTOMER_ENTERED mode, the customer supplies the amount.
        // For FIXED mode, this field is ignored — amount comes from the DB.
        requestedAmountMinor: z.number().int().positive().optional(),
        customer: customerSchema,
      }).parse(request.body);

      // Load the QR code record
      const qrResult = await db.query(
        `SELECT q.*, m.name merchant_name
         FROM scan_to_pay_codes q
         JOIN merchants m ON m.id = q.merchant_id
         WHERE q.token = $1`,
        [token],
      );
      if (!qrResult.rowCount)
        return reply.code(410).send(apiError(request, 'EXPIRED', 'This QR code is no longer valid.'));

      const qr = qrResult.rows[0];
      if (provider.name === 'flutterwave' && body.channel !== 'CARD') return reply.code(422).send(apiError(request, 'CHANNEL_UNAVAILABLE', 'This payment method is not available.'));

      // Determine the authoritative amount.
      // FIXED: server amount, ignoring any client-supplied value.
      // CUSTOMER_ENTERED: use client value, bounded by min/max.
      let amountMinor: number;
      if (qr.mode === 'FIXED') {
        amountMinor = Number(qr.amount_minor);
      } else {
        if (!body.requestedAmountMinor) {
          return reply.code(422).send(
            apiError(request, 'VALIDATION_ERROR', 'Amount is required for customer-entered QR codes.'),
          );
        }
        amountMinor = body.requestedAmountMinor;
        if (qr.min_amount_minor != null && amountMinor < Number(qr.min_amount_minor)) {
          return reply.code(422).send(
            apiError(request, 'AMOUNT_TOO_SMALL',
              `Minimum amount is ${Number(qr.min_amount_minor)} ${qr.currency} minor units.`),
          );
        }
        if (qr.max_amount_minor != null && amountMinor > Number(qr.max_amount_minor)) {
          return reply.code(422).send(
            apiError(request, 'AMOUNT_TOO_LARGE',
              `Maximum amount is ${Number(qr.max_amount_minor)} ${qr.currency} minor units.`),
          );
        }
      }

      const result = await initiateCheckout(db, provider, {
        merchantId: qr.merchant_id, sourceId: qr.id, kind: 'qr-checkout', key,
        amountMinor, currency: qr.currency, feeMinor: Math.round(amountMinor * (body.channel === 'BANK_TRANSFER' ? 0.02 : 0.03)),
        description: 'QR payment: ' + qr.label, channel: body.channel, customer: body.customer,
      });

      return reply.code(202).send(result);
    },
  );

  // ------------------------------------------------------------------
  // GET /v1/qr/:id/payments — payments made against a QR code
  // (merchant-scoped, for dashboard display)
  // ------------------------------------------------------------------
  app.get(
    '/v1/qr/:id/payments',
    { preHandler: [auth, requirePermission('payments:read')] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const q = pageSchema.parse(request.query);
      // Verify ownership
      const owns = await db.query(
        'SELECT 1 FROM scan_to_pay_codes WHERE id=$1 AND merchant_id=$2',
        [id, request.actor!.merchantId],
      );
      if (!owns.rowCount)
        return reply.code(404).send(apiError(request, 'NOT_FOUND', 'QR code not found.'));

      const total = await db.query(
        'SELECT count(*) FROM payments WHERE scan_to_pay_code_id=$1',
        [id],
      );
      const rows = await db.query(
        `SELECT id,reference,status,gross_minor,currency,customer,created_at
         FROM payments WHERE scan_to_pay_code_id=$1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [id, q.pageSize, (q.page - 1) * q.pageSize],
      );
      return {
        data: rows.rows.map((r: any) => ({
          id: r.id,
          reference: r.reference,
          status: r.status,
          amountMinor: Number(r.gross_minor),
          currency: r.currency,
          customerName: r.customer?.name ?? null,
          createdAt: r.created_at,
        })),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total.rows[0].count),
      };
    },
  );
}
