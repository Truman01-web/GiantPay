import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type {
  InitiatePaymentInput,
  PaymentProvider,
  ProviderPaymentResult,
  ProviderPaymentStatus,
  ProviderWebhookEvent,
  WebhookHeaders,
} from './types.js';
import { WebhookVerificationError } from './sandboxProvider.js';

// ---------------------------------------------------------------------------
// Flutterwave API v3 — Hosted Checkout Provider
//
// API version: v3 (https://developer.flutterwave.com/reference/introduction)
//
// Webhook auth: The `verif-hash` header contains the exact secret hash
// configured in the Flutterwave Dashboard (Settings → Webhooks → Secret Hash).
// This is a DIRECT string comparison — NOT an HMAC. Timing-safe comparison
// is still required to prevent timing attacks.
//
// Transaction verification: After receiving a webhook (or redirect callback),
// GiantPay MUST re-query GET /v3/transactions/{flw_transaction_id}/verify
// and confirm:
//   • status === "successful"
//   • currency matches the payment record exactly
//   • amount matches the payment record to the kobo/tambala (exact integer)
//   • tx_ref matches GiantPay's paymentReference
// Any mismatch → REJECT, do not confirm payment.
//
// Malawi / MWK status (as of 2026-10):
//   • MWK currency: confirmed supported in v3 payload
//   • Card payments: Visa / Mastercard confirmed
//   • Mobile money (Airtel Money Malawi): available subject to Flutterwave
//     merchant onboarding and account approval for Malawi
//   • TNM Mpamba: NOT confirmed as supported via Flutterwave API
//   • Bank transfer (Malawi): BLOCKED — unconfirmed
//   • Payouts / disbursements: DISABLED — not implemented, REAL_PAYOUTS_ENABLED=false
//   • Refunds via Flutterwave: NOT IMPLEMENTED — GiantPay uses internal refund process
//
// Live collections and real payouts remain DISABLED until credentials are
// supplied and the external blocker is resolved.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Injected HTTP transport — lets tests substitute a synthetic client without
// opening real network connections.
// ---------------------------------------------------------------------------
export interface FlutterwaveHttpClient {
  initiateCheckout(
    payload: FlutterwaveCheckoutPayload,
  ): Promise<FlutterwaveCheckoutResponse>;
  verifyTransaction(transactionId: string): Promise<FlutterwaveVerifyResponse>;
}

export interface FlutterwaveCheckoutPayload {
  tx_ref: string;
  amount: string;       // Flutterwave expects a string
  currency: string;
  redirect_url: string;
  payment_options: string;
  customer: { email: string; phonenumber?: string; name?: string };
  customizations: { title: string; description?: string; logo?: string };
}

export interface FlutterwaveCheckoutResponse {
  status: string;       // "success" or "error"
  message: string;
  data?: { link: string };
}

export interface FlutterwaveVerifyResponse {
  status: string;       // "success" or "error"
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    status: string;     // "successful", "failed", "cancelled", etc.
    currency: string;
    amount: number;     // in major units (e.g. 1500 for 1500 MWK)
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    created_at: string;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Real HTTP client — used in production when credentials are configured.
// Will throw if EXTERNAL_DELIVERY_ENABLED is false (see callers).
// ---------------------------------------------------------------------------
export class RealFlutterwaveHttpClient implements FlutterwaveHttpClient {
  constructor(
    private readonly secretKey: string,
    private readonly baseUrl = 'https://api.flutterwave.com',
    private readonly timeoutMs = 20_000,
  ) {}

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new FlutterwaveClientError(
          `FLW ${method} ${path} returned HTTP ${res.status}`,
          res.status,
          text.slice(0, 500),
        );
      }
      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  async initiateCheckout(
    payload: FlutterwaveCheckoutPayload,
  ): Promise<FlutterwaveCheckoutResponse> {
    return this.request<FlutterwaveCheckoutResponse>('POST', '/v3/payments', payload);
  }

  async verifyTransaction(transactionId: string): Promise<FlutterwaveVerifyResponse> {
    return this.request<FlutterwaveVerifyResponse>(
      'GET',
      `/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    );
  }
}

export class FlutterwaveClientError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly responseBody: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Extended provider result — includes the hosted checkout URL and the
// Flutterwave transaction reference so the frontend knows where to redirect.
// ---------------------------------------------------------------------------
export interface FlutterwavePaymentResult extends ProviderPaymentResult {
  checkoutUrl: string;
}

// ---------------------------------------------------------------------------
// Webhook payload schema (Flutterwave v3 charge.completed shape)
// Only the fields we need are validated; extra fields are ignored.
// ---------------------------------------------------------------------------
const flwWebhookSchema = z.object({
  event: z.literal('charge.completed'),
  data: z.object({
    id: z.number().int().positive(),               // Flutterwave numeric transaction ID
    tx_ref: z.string().min(1).max(200),            // GiantPay paymentReference
    flw_ref: z.string().min(1).max(200),           // Flutterwave internal ref
    status: z.string().min(1),                     // "successful" | "failed" | etc.
    currency: z.string().regex(/^[A-Z]{3}$/),
    amount: z.number(),                            // major units
    charged_amount: z.number(),
    customer: z.object({
      email: z.string().nullish(),
      name: z.string().nullish(),
      phone_number: z.string().nullish(),
    }),
  }),
}).passthrough();                                   // allow extra fields

export type FlwWebhookPayload = z.infer<typeof flwWebhookSchema>;

function flwStatusToGiantPay(flwStatus: string): 'SUCCEEDED' | 'FAILED' | 'PROCESSING' {
  switch (flwStatus.toLowerCase()) {
    case 'successful': return 'SUCCEEDED';
    case 'failed':
    case 'cancelled':  return 'FAILED';
    default:           return 'PROCESSING';
  }
}

// ---------------------------------------------------------------------------
// FlutterwavePaymentProvider
// ---------------------------------------------------------------------------
export class FlutterwavePaymentProvider implements PaymentProvider {
  readonly name = 'flutterwave';

  constructor(
    private readonly secretKey: string,
    private readonly publicKey: string,
    private readonly secretHash: string,          // Flutterwave Dashboard → Settings → Webhooks → Secret Hash
    private readonly redirectBaseUrl: string,      // e.g. https://giantpay.mw  (backend verifies, never trusts redirect)
    private readonly httpClient: FlutterwaveHttpClient,
    deploymentEnvironment?: string,
  ) {
    if (deploymentEnvironment === 'production') {
      // In production the real client must be provided — enforce here.
      if (!(httpClient instanceof RealFlutterwaveHttpClient)) {
        throw new Error(
          'FlutterwavePaymentProvider: production deployment requires RealFlutterwaveHttpClient.',
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // initiatePayment — opens a hosted checkout session on Flutterwave.
  //
  // GiantPay NEVER collects raw card numbers or mobile-money PINs.
  // The customer is redirected to Flutterwave's hosted page.
  // The returned `checkoutUrl` is provided to the frontend for the redirect.
  // -------------------------------------------------------------------------
  async initiatePayment(input: InitiatePaymentInput): Promise<FlutterwavePaymentResult> {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new FlutterwaveClientError('Invalid payment amount.', 422, '');
    }
    if (!['MWK'].includes(input.currency)) {
      // Block currencies that are not confirmed for Flutterwave/Malawi.
      throw new FlutterwaveClientError(
        `Currency ${input.currency} is not supported for Flutterwave Malawi collections.`,
        422,
        '',
      );
    }

    // Map GiantPay channel to Flutterwave payment_options.
    // Bank transfer and TNM Mpamba are NOT confirmed for Malawi via Flutterwave.
    const paymentOptions = mapChannelToFlutterwaveOptions(input.channel);

    // Amount: GiantPay stores in minor units (tambala for MWK).
    // Flutterwave expects MWK in MAJOR units (whole Kwacha).
    // MWK has 2 decimal places (100 tambala = 1 Kwacha).
    const majorAmount = (input.amountMinor / 100).toFixed(2);

    const payload: FlutterwaveCheckoutPayload = {
      tx_ref: input.paymentReference,
      amount: majorAmount,
      currency: input.currency,
      // Redirect URL is a GiantPay server endpoint — the frontend never
      // trusts the redirect query params to confirm payment; it re-queries.
      redirect_url: `${this.redirectBaseUrl}/v1/webhooks/providers/flutterwave/redirect`,
      payment_options: paymentOptions,
      customer: {
        email: input.customer.email ?? 'noreply@giantpay.mw',
        phonenumber: input.customer.phone,
        name: input.customer.name,
      },
      customizations: {
        title: 'GiantPay',
        description: input.paymentReference,
      },
    };

    const response = await this.httpClient.initiateCheckout(payload);
    if (response.status !== 'success' || !response.data?.link) {
      throw new FlutterwaveClientError(
        `Flutterwave checkout initiation failed: ${response.message}`,
        502,
        '',
      );
    }
    const checkoutUrl = new URL(response.data.link);
    if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.flutterwave.com' || checkoutUrl.port || checkoutUrl.username || checkoutUrl.password) {
      throw new FlutterwaveClientError('Invalid Flutterwave checkout URL.', 502, '');
    }

    // We use the tx_ref (paymentReference) as our providerPaymentId initially.
    // The real numeric Flutterwave transaction ID arrives via webhook or verify.
    return {
      providerPaymentId: input.paymentReference,
      status: 'PROCESSING',
      checkoutUrl: response.data.link,
    };
  }

  // -------------------------------------------------------------------------
  // getPaymentStatus — re-queries Flutterwave for the authoritative status.
  //
  // Called with the numeric Flutterwave transaction ID (not the tx_ref).
  // If the payment is still processing, returns 'PROCESSING'.
  // -------------------------------------------------------------------------
  async getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    // The generic interface has no expected amount, currency or reference.
    // It cannot safely confirm Flutterwave payments. Use the bound verifier.
    return { providerPaymentId, status: 'PROCESSING' };
  }

  // -------------------------------------------------------------------------
  // parseAndVerifyWebhook — authenticates and parses a Flutterwave webhook.
  //
  // Flutterwave v3 webhook auth: the `verif-hash` header contains the exact
  // secret hash from your Dashboard settings. This is a direct string
  // comparison (not HMAC), so we use timingSafeEqual to prevent timing attacks.
  //
  // IMPORTANT: After this method returns, the caller (webhookProcessor) must
  // call verifyTransactionAfterWebhook() to re-query Flutterwave and confirm
  // the amount, currency, reference, and status before posting to the ledger.
  // The webhook is only a notification — it is NEVER proof of payment.
  // -------------------------------------------------------------------------
  parseAndVerifyWebhook(
    rawBody: Buffer,
    headers: WebhookHeaders & { verifHash?: string },
    _now?: Date,
  ): ProviderWebhookEvent {
    // Flutterwave uses 'verif-hash' (not 'x-giantpay-signature').
    const verifHash = headers.verifHash ?? headers.signature;
    if (!verifHash) {
      throw new WebhookVerificationError(
        'MISSING_VERIF_HASH',
        401,
        'Flutterwave verif-hash header is required.',
      );
    }

    // Timing-safe comparison — even though this is a direct equality check
    // rather than an HMAC, timing safety still matters.
    const expected = Buffer.from(this.secretHash, 'utf8');
    let received: Buffer;
    try {
      received = Buffer.from(verifHash, 'utf8');
    } catch {
      throw new WebhookVerificationError(
        'INVALID_VERIF_HASH',
        401,
        'Flutterwave verif-hash is invalid.',
      );
    }
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new WebhookVerificationError(
        'INVALID_VERIF_HASH',
        401,
        'Flutterwave verif-hash does not match.',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new WebhookVerificationError(
        'MALFORMED_PAYLOAD',
        422,
        'Flutterwave webhook payload must be valid JSON.',
      );
    }

    const result = flwWebhookSchema.safeParse(parsed);
    if (!result.success) {
      throw new WebhookVerificationError(
        'INVALID_PAYLOAD',
        422,
        'Flutterwave webhook payload is invalid.',
      );
    }

    const data = result.data.data;

    // Map to GiantPay's ProviderWebhookEvent.
    // We use the Flutterwave numeric ID as the providerPaymentId.
    // The eventId is "<flw_transaction_id>" — unique per transaction.
    return {
      eventId: `${data.id}:${data.status.toLowerCase()}`,
      eventType: 'payment.status.changed',
      paymentReference: data.tx_ref,
      providerPaymentId: String(data.id),
      status: flwStatusToGiantPay(data.status),
      occurredAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // verifyTransactionAfterWebhook
  //
  // MUST be called before confirming payment. Re-queries Flutterwave and
  // validates all of: status, currency, exact integer amount, tx_ref.
  //
  // Returns the verified data, or throws with a rejection reason.
  // -------------------------------------------------------------------------
  async verifyTransactionAfterWebhook(options: {
    flwTransactionId: string;
    expectedTxRef: string;
    expectedAmountMinor: number;   // GiantPay stores in minor units
    expectedCurrency: string;
  }): Promise<{
    flwTransactionId: string;
    flwRef: string;
    status: 'SUCCEEDED' | 'PROCESSING';
  }> {
    const response = await this.httpClient.verifyTransaction(options.flwTransactionId);

    if (response.status !== 'success' || !response.data) {
      throw new FlutterwaveVerificationError(
        'VERIFY_UNAVAILABLE',
        'Flutterwave transaction verification returned no data.',
      );
    }

    const d = response.data;

    if (!Number.isSafeInteger(d.id) || String(d.id) !== options.flwTransactionId) {
      throw new FlutterwaveVerificationError('TRANSACTION_ID_MISMATCH', 'Flutterwave transaction ID does not match.');
    }

    // 2. Currency must match exactly (case-sensitive, ISO 4217).
    if (d.currency !== options.expectedCurrency) {
      throw new FlutterwaveVerificationError(
        'CURRENCY_MISMATCH',
        `Flutterwave currency ${d.currency} does not match expected ${options.expectedCurrency}.`,
      );
    }

    // 3. Amount: Flutterwave returns major units; compare to minor units.
    // MWK has 2 decimal places. We round to avoid float drift.
    const receivedMinor = Math.round(d.amount * 100);
    if (!Number.isFinite(d.amount) || !Number.isSafeInteger(receivedMinor) || Math.abs(d.amount * 100 - receivedMinor) > 0.000001 || receivedMinor !== options.expectedAmountMinor) {
      throw new FlutterwaveVerificationError(
        'AMOUNT_MISMATCH',
        `Flutterwave amount ${d.amount} (${receivedMinor} minor) does not match expected ${options.expectedAmountMinor} minor.`,
      );
    }

    // 4. tx_ref must match GiantPay's paymentReference.
    if (d.tx_ref !== options.expectedTxRef) {
      throw new FlutterwaveVerificationError(
        'REFERENCE_MISMATCH',
        `Flutterwave tx_ref ${d.tx_ref} does not match expected ${options.expectedTxRef}.`,
      );
    }

    return {
      flwTransactionId: String(d.id),
      flwRef: d.flw_ref,
      // Hosted checkout can have failed attempts followed by a successful retry.
      // Only success is terminal here; every other outcome needs reconciliation.
      status: d.status === 'successful' ? 'SUCCEEDED' : 'PROCESSING',
    };
  }

  // -------------------------------------------------------------------------
  // initiateRefund — NOT implemented. Flutterwave refund capability is not
  // confirmed for Malawi. GiantPay uses its own internal refund process.
  // -------------------------------------------------------------------------
  async initiateRefund(): Promise<never> {
    throw new Error(
      'Flutterwave refund execution is not implemented. Use GiantPay internal refund process.',
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export class FlutterwaveVerificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

/**
 * Map GiantPay payment channels to Flutterwave payment_options strings.
 *
 * Confirmed for MWK/Malawi (as of 2026-10):
 *   CARD         → "card"        (Visa, Mastercard)
 *   MOBILE_MONEY → "mobilemoney" (subject to Flutterwave Malawi account approval)
 *
 * NOT confirmed:
 *   BANK_TRANSFER → blocked; Flutterwave bank transfer for Malawi not confirmed
 */
export function mapChannelToFlutterwaveOptions(
  channel: 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER',
): string {
  switch (channel) {
    case 'CARD':
      return 'card';
    case 'MOBILE_MONEY':
      return 'mobilemoney';
    case 'BANK_TRANSFER':
      throw new FlutterwaveClientError(
        'Bank transfer via Flutterwave is not confirmed for Malawi. BLOCKED.',
        422,
        '',
      );
  }
}
