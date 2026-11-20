import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
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
// GiantPay references (security.ts: newId = `${prefix}_${randomUUID without
// dashes}`) are always 35 characters for checkout ("GP_" + 32 hex), which
// exceeds OneKhusa's confirmed sourceReferenceNumber limit of 25 characters.
// Confirmed live: a real checkout through the running server had its
// provider.initiatePayment call silently swallowed by GiantPay's own
// durable-checkout design (initiateCheckout.ts catches provider errors and
// returns an "uncertain outcome" PROCESSING response), masking what was
// actually a hard rejection — no real OneKhusa transaction was ever created.
//
// Fix: reversibly shrink the 128-bit UUID portion to ~22 base62 characters
// before sending it as sourceReferenceNumber, and reverse it when a webhook
// arrives so ProviderWebhookEvent.paymentReference still matches
// payments.reference exactly (processPaymentWebhook looks it up verbatim).
// ---------------------------------------------------------------------------
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const GIANTPAY_REFERENCE_PATTERN = /^GP_([0-9a-f]{32})$/;

function base62EncodeHex(hex: string): string {
  let n = BigInt(`0x${hex}`);
  if (n === 0n) return '0';
  let out = '';
  while (n > 0n) {
    out = BASE62_ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}

function base62DecodeToHex(encoded: string, hexLength: number): string | undefined {
  let n = 0n;
  for (const ch of encoded) {
    const idx = BASE62_ALPHABET.indexOf(ch);
    if (idx === -1) return undefined;
    n = n * 62n + BigInt(idx);
  }
  const hex = n.toString(16);
  return hex.length > hexLength ? undefined : hex.padStart(hexLength, '0');
}

// Encodes a GiantPay "GP_<32 hex>" reference into OneKhusa's sourceReferenceNumber
// constraints. Falls back to the raw reference (with the original 5-25 char
// validation) for any shape that isn't GiantPay's standard checkout reference.
function encodeSourceReferenceNumber(paymentReference: string): string {
  const match = GIANTPAY_REFERENCE_PATTERN.exec(paymentReference);
  if (match) return `GPX${base62EncodeHex(match[1]!)}`;
  if (paymentReference.length < 5 || paymentReference.length > 25) {
    throw new OneKhusaClientError(
      `paymentReference must be 5-25 characters for OneKhusa (got ${paymentReference.length}).`,
      422,
      '',
    );
  }
  return paymentReference;
}

// Reverses encodeSourceReferenceNumber. Returns the value unchanged if it
// doesn't decode to a GiantPay-shaped reference (e.g. a non-standard
// paymentReference that went through the raw fallback above).
function decodeSourceReferenceNumber(sourceReferenceNumber: string): string {
  const match = /^GPX([0-9A-Za-z]{21,22})$/.exec(sourceReferenceNumber);
  if (!match) return sourceReferenceNumber;
  const hex = base62DecodeToHex(match[1]!, 32);
  return hex && base62EncodeHex(hex) === match[1] ? `GP_${hex}` : sourceReferenceNumber;
}

// ---------------------------------------------------------------------------
// OneKhusa — Mobile Money Push Payment Provider
//
// Docs: https://docs.onekhusa.com (Mintlify, confirmed current as of 2026-11-18)
//
// CONFIRMED from docs:
//   - Auth: OAuth 2.0 client-credentials-style exchange. POST
//     /account/getAccessToken with { apiKey, apiSecret, organisationId,
//     merchantAccountNumber } returns a JWT valid for 5 minutes.
//   - Collections: POST /collections/push/direct/initiate dispatches an STK/
//     USSD push prompt to the payer's phone. responseCode "I100" confirms the
//     prompt was *dispatched*, not that the customer approved it — final
//     outcome is asynchronous.
//   - Status check: POST /collections/inquiry/transactionStatus with
//     { merchantAccountNumber, sourceReferenceNumber } returns
//     { beneficiary, source, transaction }, with the live status at
//     transaction.transactionStatusCode. The docs give no full status-code
//     enum beyond "S"=Success, so unrecognized codes fall back to
//     PROCESSING here rather than guessing. The docs explicitly warn against
//     polling this — "perform this action when your system has not received
//     the webhook notification after its expiry period" — so this should
//     only be called as a fallback, not routinely.
//   - Sandbox base URL: https://api.onekhusa.com/sandbox/v1
//
// WEBHOOK VERIFICATION — checked against sandbox deliveries and current docs:
//   - Header: X-OneKhusa-Webhook-Signature, lowercase hex.
//   - Algorithm: HMAC-SHA512 over the raw, unparsed request body (confirmed:
//     signatures are 128 hex chars). The docs' own examples looked like
//     SHA-256 length (64 chars) — that was wrong; trust the real captures.
//   - Each event (pushpayment.success / .failed / .reversed) has its OWN
//     secret, from Developers → Webhooks → Manage → View per event — NOT the
//     API Secret.
//   - Published success/reversal examples have distinct sourceReferenceNumber
//     and merchantReferenceNumber values; an earlier sandbox capture reportedly
//     matched our submitted reference in merchantReferenceNumber. Preserve both
//     as candidates and match them against a durable payment before use.
//   - No timestamp/replay protection is provided by OneKhusa itself. Because
//     the signature is a true HMAC bound to the exact payload (unlike
//     Flutterwave's static verif-hash), signature verification alone is
//     sufficient proof of authenticity — no mandatory re-verification call
//     is needed the way FlutterwavePaymentProvider requires one.
//
// NOT YET CONFIRMED / explicitly out of scope for this first pass:
//   - Production base URL. Not shown anywhere in the docs read so far.
//   - Card and bank-transfer collections (a separate "Standard Checkout"
//     endpoint exists per the docs sidebar but hasn't been read). Only
//     MOBILE_MONEY is implemented here; other channels are rejected.
//   - A real pushpayment.reversed payload was never captured in sandbox
//     testing (only success and failed were). Its schema below is inferred
//     from the docs' claim that it mirrors the success shape — treat with
//     slightly less confidence than the other two until one is seen.
//
// Confirmed sandbox business rules (not in any docs page, found by trial and
// error against the real API):
//   - Minimum transactionAmount is MWK 500.00.
//   - transactionDescription must be alphanumeric + spaces only — no dashes
//     or other punctuation.
//   - X-Idempotency-Key must be 15-80 chars (letters/digits/dashes), which is
//     wider than sourceReferenceNumber's 5-25 — don't assume one value always
//     satisfies both constraints.
//   - The merchant account needs an active settlement bank account AND all
//     three pushpayment.* webhooks registered before push payments are even
//     accepted, regardless of whether those webhooks ever fire.
//
// Live collections are disabled until a production base URL is confirmed —
// enforced in providers/index.ts, mirroring the Flutterwave guard.
// ---------------------------------------------------------------------------

export interface OneKhusaAccessTokenRequest {
  apiKey: string;
  apiSecret: string;
  organisationId: string;
  merchantAccountNumber: number;
}

export interface OneKhusaAccessTokenResponse {
  accessToken: string;
  expiresOn: string;
  expiryInMinutes: number;
}

export interface OneKhusaPushPaymentPayload {
  merchantAccountNumber: number;
  connectorId: number;
  payerAccountNumber: string;
  sourceReferenceNumber: string;
  transactionDescription: string;
  transactionAmount: number;
  capturedBy: string;
}

export interface OneKhusaPushPaymentResponse {
  merchantAccountNumber: number;
  sourceReferenceNumber: string;
  responseCode: string;
  feeRuleCode: string;
  transactionAmount: number;
  totalCharges: number;
  amountToPay: number;
}

export interface OneKhusaTransactionStatusRequest {
  merchantAccountNumber: number;
  sourceReferenceNumber: string;
}

export interface OneKhusaTransactionStatusResponse {
  beneficiary: { accountNumber: number; accountName: string; amountReceived: number; currencyCode: string };
  source: {
    accountNumber: string;
    customerName: string;
    amountSent: number;
    currencyCode: string;
    sourceReferenceNumber: string;
    connectorId: number;
    connectorName: string;
  };
  transaction: {
    transactionReferenceNumber: string;
    transactionFee: number;
    transactionDescription: string;
    transactionDate: string;
    transactionStatusCode: string;
    transactionStatusName: string;
    responseCode: string;
    responseMessage: string;
  };
}

// ---------------------------------------------------------------------------
// Injected HTTP transport — lets tests substitute a synthetic client without
// opening real network connections (mirrors FlutterwaveHttpClient).
// ---------------------------------------------------------------------------
export interface OneKhusaHttpClient {
  getAccessToken(request: OneKhusaAccessTokenRequest): Promise<OneKhusaAccessTokenResponse>;
  initiatePushPayment(
    payload: OneKhusaPushPaymentPayload,
    accessToken: string,
    idempotencyKey: string,
  ): Promise<OneKhusaPushPaymentResponse>;
  inquireTransactionStatus(
    request: OneKhusaTransactionStatusRequest,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<OneKhusaTransactionStatusResponse>;
}

// ---------------------------------------------------------------------------
// Webhook payload schemas. `.passthrough()` tolerates fields we
// don't use; only the ones GiantPay actually needs are required.
// ---------------------------------------------------------------------------
const pushPaymentSuccessOrReversedSchema = z.object({
  merchantReferenceNumber: z.string().min(1).max(200),
  sourceReferenceNumber: z.string().min(1).max(200).optional(),
  transactionReferenceNumber: z.string().min(1).max(200).optional(),
  transactionAmount: z.number().finite().positive(),
  transactionDate: z.string().min(1).refine(value => Number.isFinite(Date.parse(value))),
  transactionStatusCode: z.enum(['S', 'R']),
  responseCode: z.string().min(1),
}).passthrough();

const pushPaymentFailedSchema = z.object({
  merchantReferenceNumber: z.string().min(1).max(200),
  sourceReferenceNumber: z.string().min(1).max(200).optional(),
  transactionAmount: z.number().finite().positive(),
  transactionDate: z.string().min(1).refine(value => Number.isFinite(Date.parse(value))),
  transactionStatusCode: z.literal('F'),
  responseCode: z.string().min(1),
}).passthrough();

// Published webhook examples use transactionStatusCode for the payment
// outcome (S/F/R).
function oneKhusaStatusToGiantPay(code: string): 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PROCESSING' {
  switch (code) {
    case 'S': return 'SUCCEEDED';
    // A "reversed" push payment means funds were collected then returned —
    // the closest valid transition from SUCCEEDED in GiantPay's payment
    // state machine (paymentState.ts) is REFUNDED, not a dedicated REVERSED
    // state (which doesn't exist).
    case 'R': return 'REFUNDED';
    case 'F': return 'FAILED';
    default: return 'PROCESSING';
  }
}

// For the /collections/inquiry/transactionStatus RESPONSE ONLY — do not
// reuse oneKhusaStatusToGiantPay here. Confirmed empirically: a genuinely
// successful payment's transaction.transactionStatusCode came back "N"
// ("Unreconciled") — that field reflects OneKhusa's internal
// settlement/reconciliation state at this endpoint, NOT the payment outcome
// (despite sharing a field name with the webhook payload, where it does mean
// outcome). The reliable outcome signal here is responseCode: "S100" with
// responseMessage "Successful transaction" appeared on the same call where
// transactionStatusCode said "Unreconciled". Error-class codes observed so
// far (e.g. "E256") are prefixed "E"; treat that prefix as failure.
function oneKhusaInquiryResponseCodeToGiantPay(statusCode: string, responseCode: string): 'SUCCEEDED' | 'FAILED' | 'PROCESSING' {
  if (statusCode === 'S') return 'SUCCEEDED';
  if (['F', 'E', 'X', 'C'].includes(statusCode)) return 'FAILED';
  if (['R', 'T', 'D', 'P'].includes(statusCode)) return 'PROCESSING';
  if (responseCode === 'S100') return 'SUCCEEDED';
  if (/^E\d+$/.test(responseCode)) return 'FAILED';
  return 'PROCESSING';
}

export class OneKhusaClientError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly responseBody: string,
  ) {
    super(message);
  }
  get statusCode() { return this.httpStatus; }
  get code() { return this.httpStatus < 500 ? 'PROVIDER_VALIDATION' : 'PROVIDER_UNAVAILABLE'; }
}

// ---------------------------------------------------------------------------
// Real HTTP client — used when credentials are configured.
// ---------------------------------------------------------------------------
export class RealOneKhusaHttpClient implements OneKhusaHttpClient {
  constructor(
    private readonly baseUrl = 'https://api.onekhusa.com/sandbox/v1',
    private readonly timeoutMs = 20_000,
  ) {}

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    headers: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new OneKhusaClientError(
          `OneKhusa ${method} ${path} returned HTTP ${res.status}`,
          res.status,
          text.slice(0, 500),
        );
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async getAccessToken(request: OneKhusaAccessTokenRequest): Promise<OneKhusaAccessTokenResponse> {
    return this.request<OneKhusaAccessTokenResponse>('POST', '/account/getAccessToken', request, {});
  }

  async initiatePushPayment(
    payload: OneKhusaPushPaymentPayload,
    accessToken: string,
    idempotencyKey: string,
  ): Promise<OneKhusaPushPaymentResponse> {
    return this.request<OneKhusaPushPaymentResponse>(
      'POST',
      '/collections/push/direct/initiate',
      payload,
      {
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
    );
  }

  async inquireTransactionStatus(
    request: OneKhusaTransactionStatusRequest,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<OneKhusaTransactionStatusResponse> {
    return this.request<OneKhusaTransactionStatusResponse>(
      'POST',
      '/collections/inquiry/transactionStatus',
      request,
      { Authorization: `Bearer ${accessToken}` },
      signal,
    );
  }
}

// ---------------------------------------------------------------------------
// OneKhusaPaymentProvider
// ---------------------------------------------------------------------------
export class OneKhusaPaymentProvider implements PaymentProvider {
  readonly name = 'onekhusa';

  // Access tokens are valid for 5 minutes; cached in memory and refreshed
  // with a safety margin rather than re-fetched on every call.
  private cachedToken: { accessToken: string; expiresAtMs: number } | null = null;
  private static readonly TOKEN_REFRESH_MARGIN_MS = 30_000;

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly organisationId: string,
    private readonly merchantAccountNumber: number,
    private readonly airtelConnectorId: number,
    private readonly tnmConnectorId: number,
    private readonly capturedByEmail: string,
    private readonly webhookSecretSuccess: string,
    private readonly webhookSecretFailed: string,
    private readonly webhookSecretReversed: string,
    private readonly httpClient: OneKhusaHttpClient,
    deploymentEnvironment?: string,
  ) {
    if (deploymentEnvironment === 'production') {
      // In production the real client must be provided — enforce here.
      if (!(httpClient instanceof RealOneKhusaHttpClient)) {
        throw new Error(
          'OneKhusaPaymentProvider: production deployment requires RealOneKhusaHttpClient.',
        );
      }
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAtMs - OneKhusaPaymentProvider.TOKEN_REFRESH_MARGIN_MS > now) {
      return this.cachedToken.accessToken;
    }
    const response = await this.httpClient.getAccessToken({
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      organisationId: this.organisationId,
      merchantAccountNumber: this.merchantAccountNumber,
    });
    const expiresAtMs = now + response.expiryInMinutes * 60_000;
    this.cachedToken = { accessToken: response.accessToken, expiresAtMs };
    return response.accessToken;
  }

  // -------------------------------------------------------------------------
  // resolveConnectorId — Airtel Money and TNM Mpamba are separate OneKhusa
  // connectors (confirmed via the OneKhusa dashboard: Airtel Money=112400,
  // TNM Mpamba=112500 for this merchant). GiantPay's InitiatePaymentInput
  // only carries a generic MOBILE_MONEY channel, not a specific network, so
  // the network is inferred from the Malawi MSISDN prefix:
  //   Airtel Malawi: 099 / 098
  //   TNM Malawi:    088 / 089
  // This prefix mapping is standard Malawi telecom numbering, NOT something
  // confirmed on an OneKhusa docs page — worth cross-checking against their
  // sandbox "Test Accounts" page if push prompts ever land on the wrong
  // network in testing.
  // -------------------------------------------------------------------------
  private resolveConnectorId(phone: string): number {
    const digits = phone.replace(/\D/g, '');
    let local: string;
    if (digits.startsWith('265')) local = digits.slice(3);
    else if (digits.startsWith('0')) local = digits.slice(1);
    else local = digits;

    const prefix = local.slice(0, 2);
    if (prefix === '99' || prefix === '98') return this.airtelConnectorId;
    if (prefix === '88' || prefix === '89') return this.tnmConnectorId;

    throw new OneKhusaClientError(
      `Unable to determine mobile money network for phone number ${phone}: unrecognized prefix.`,
      422,
      '',
    );
  }

  // -------------------------------------------------------------------------
  // X-Idempotency-Key must be 15-80 chars (letters/digits/dashes) — wider
  // than sourceReferenceNumber's 5-25, confirmed against the sandbox
  // ("Incorrect X-Idempotency-Key Value" for a 14-char key). A short
  // paymentReference would satisfy the former but fail the latter, so derive
  // a fixed-length, deterministic key instead of reusing paymentReference
  // directly — same paymentReference always produces the same key (true
  // idempotency on retry), and it always satisfies both constraints.
  // -------------------------------------------------------------------------
  private static buildIdempotencyKey(paymentReference: string): string {
    const hash = createHash('sha256').update(paymentReference).digest('hex').slice(0, 32);
    return `giantpay-${hash}`;
  }

  // -------------------------------------------------------------------------
  // initiatePayment — dispatches a mobile-money STK/USSD push prompt.
  //
  // Only MOBILE_MONEY/MWK is implemented. CARD and BANK_TRANSFER use a
  // different OneKhusa endpoint ("Standard Checkout") not yet integrated.
  //
  // responseCode "I100" only confirms the prompt was dispatched — the
  // customer still has to approve it on their phone. GiantPay therefore
  // reports PROCESSING here, matching the interface's constraint, and relies
  // on the signed webhook handler for the final outcome.
  // -------------------------------------------------------------------------
  validatePaymentInput(input: InitiatePaymentInput): void {
    if (input.channel !== 'MOBILE_MONEY') {
      throw new OneKhusaClientError(`OneKhusa channel ${input.channel} is not implemented. Only MOBILE_MONEY is supported currently.`, 422, '');
    }
    if (input.currency !== 'MWK') {
      throw new OneKhusaClientError(`Currency ${input.currency} is not supported for OneKhusa collections.`, 422, '');
    }
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new OneKhusaClientError('Invalid payment amount.', 422, '');
    }
    if (input.amountMinor < 50_000) {
      throw new OneKhusaClientError('OneKhusa requires a minimum amount of MWK 500.00.', 422, '');
    }
    if (!input.customer.phone) {
      throw new OneKhusaClientError('A payer phone number (MSISDN) is required for OneKhusa push payments.', 422, '');
    }
    this.resolveConnectorId(input.customer.phone);
    encodeSourceReferenceNumber(input.paymentReference);
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<ProviderPaymentResult> {
    this.validatePaymentInput(input);
    // sourceReferenceNumber must fit OneKhusa's 5-25 char constraint —
    // GiantPay's own "GP_"+32-hex references are always 35 chars, so this
    // reversibly shrinks them (see encodeSourceReferenceNumber above).
    const sourceReferenceNumber = encodeSourceReferenceNumber(input.paymentReference);

    const accessToken = await this.getAccessToken();

    // MWK has 2 decimal places (100 tambala = 1 Kwacha); GiantPay stores
    // amounts in minor units, OneKhusa expects major units as a number.
    const majorAmount = Math.round(input.amountMinor) / 100;

    // Confirmed against the sandbox: "Payer Account Number should contain
    // only numbers" — OneKhusa rejects the leading "+" GiantPay's own
    // customer.phone validation requires (E.164, e.g. "+265991234567").
    const payerAccountNumber = input.customer.phone!.replace(/\D/g, '');

    const payload: OneKhusaPushPaymentPayload = {
      merchantAccountNumber: this.merchantAccountNumber,
      connectorId: this.resolveConnectorId(input.customer.phone!),
      payerAccountNumber,
      sourceReferenceNumber,
      // OneKhusa rejects anything but letters, digits and spaces here (confirmed
      // against the sandbox: a reference-embedding description with a dash was
      // rejected with "Description should contain alpha-numeric characters with
      // spaces."). Keep this free of paymentReference's punctuation.
      transactionDescription: 'GiantPay payment',
      transactionAmount: majorAmount,
      capturedBy: this.capturedByEmail,
    };

    const response = await this.httpClient.initiatePushPayment(
      payload,
      accessToken,
      OneKhusaPaymentProvider.buildIdempotencyKey(input.paymentReference),
    );

    if (response.responseCode !== 'I100') {
      throw new OneKhusaClientError(
        `OneKhusa push payment initiation failed: responseCode=${response.responseCode}`,
        502,
        '',
      );
    }

    return {
      // OneKhusa's push-payment response carries no separate transaction ID —
      // sourceReferenceNumber (which we generated) is the only correlation
      // key returned, so it doubles as the providerPaymentId.
      providerPaymentId: response.sourceReferenceNumber,
      status: 'PROCESSING',
    };
  }

  // -------------------------------------------------------------------------
  // getPaymentStatus — real inquiry-by-reference call. providerPaymentId is
  // OneKhusa's own encoded reference (see encodeSourceReferenceNumber /
  // initiatePayment), not GiantPay's raw "GP_..." paymentReference — exactly
  // what sourceReferenceNumber expects here.
  //
  // Per OneKhusa's own usage guidance, this should only be called as a
  // fallback when a webhook hasn't arrived after its expected window — not
  // polled routinely — so callers (e.g. a reconciliation worker) should
  // apply their own rate limiting rather than call this per-request.
  //
  // Confirmed empirically: a reference OneKhusa doesn't recognize (e.g. a
  // push payment that expired before authorization, which apparently never
  // gets a queryable transaction record) returns HTTP 200 with an EMPTY
  // body — not a 404 or an error object — which fails JSON parsing. Any
  // request failure, including this one, falls back to PROCESSING rather
  // than throwing or asserting a specific outcome, since the webhook
  // remains the authoritative source of truth.
  // -------------------------------------------------------------------------
  async getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await this.httpClient.inquireTransactionStatus(
        { merchantAccountNumber: this.merchantAccountNumber, sourceReferenceNumber: providerPaymentId },
        accessToken,
      );
      return { providerPaymentId, status: oneKhusaInquiryResponseCodeToGiantPay(response.transaction.transactionStatusCode, response.transaction.responseCode) };
    } catch {
      return { providerPaymentId, status: 'PROCESSING' };
    }
  }

  async recoverPayment(expected: { reference: string; amountMinor: number; currency: string; transactionId: string | null }, signal?: AbortSignal) {
    const sourceReferenceNumber = encodeSourceReferenceNumber(expected.reference);
    const accessToken = await this.getAccessToken();
    const response = await this.httpClient.inquireTransactionStatus(
      { merchantAccountNumber: this.merchantAccountNumber, sourceReferenceNumber },
      accessToken,
      signal,
    );
    const amountMinor = Math.round(response.source.amountSent * 100);
    if (response.source.sourceReferenceNumber !== sourceReferenceNumber ||
      response.source.currencyCode !== expected.currency ||
      !Number.isSafeInteger(amountMinor) || amountMinor !== expected.amountMinor ||
      expected.currency !== 'MWK') {
      throw new Error('OneKhusa recovery inquiry did not match the durable payment intent.');
    }
    const status = oneKhusaInquiryResponseCodeToGiantPay(response.transaction.transactionStatusCode, response.transaction.responseCode);
    return { providerPaymentId: sourceReferenceNumber, status };
  }

  // -------------------------------------------------------------------------
  // parseAndVerifyWebhook — HMAC-SHA512 over the raw body, per-event secret.
  // See the header comment for how this was confirmed. Unlike Flutterwave,
  // no mandatory re-verification call is needed: the signature is a true
  // HMAC bound to the exact payload, not a static shared token.
  // -------------------------------------------------------------------------
  parseAndVerifyWebhook(rawBody: Buffer, headers: WebhookHeaders, _now?: Date): ProviderWebhookEvent {
    const event = headers.event;
    const signature = headers.signature;

    if (!event) {
      throw new WebhookVerificationError('MISSING_EVENT', 400, 'OneKhusa X-OneKhusa-Webhook-Event header is required.');
    }
    if (!signature) {
      throw new WebhookVerificationError('MISSING_SIGNATURE', 401, 'OneKhusa X-OneKhusa-Webhook-Signature header is required.');
    }

    const secret = this.webhookSecretForEvent(event);
    if (!secret) {
      throw new WebhookVerificationError('UNKNOWN_EVENT', 400, `Unrecognized OneKhusa webhook event: ${event}`);
    }

    const computedHex = createHmac('sha512', secret).update(rawBody).digest('hex');
    let expected: Buffer;
    let received: Buffer;
    try {
      expected = Buffer.from(computedHex, 'hex');
      received = Buffer.from(signature.toLowerCase(), 'hex');
    } catch {
      throw new WebhookVerificationError('INVALID_SIGNATURE', 401, 'OneKhusa webhook signature is not valid hex.');
    }
    if (received.length === 0 || received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new WebhookVerificationError('INVALID_SIGNATURE', 401, 'OneKhusa webhook signature does not match.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new WebhookVerificationError('MALFORMED_PAYLOAD', 422, 'OneKhusa webhook payload must be valid JSON.');
    }

    const schema = event === 'pushpayment.failed' ? pushPaymentFailedSchema : pushPaymentSuccessOrReversedSchema;
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new WebhookVerificationError('INVALID_PAYLOAD', 422, 'OneKhusa webhook payload is invalid.');
    }
    const data = result.data;

    const occurredAt = new Date(data.transactionDate).toISOString();
    const transactionReferenceNumber = 'transactionReferenceNumber' in data ? data.transactionReferenceNumber : undefined;
    const amountMinor = Math.round(data.transactionAmount * 100);
    if (!Number.isSafeInteger(amountMinor) || Math.abs(data.transactionAmount * 100 - amountMinor) > 1e-7) {
      throw new WebhookVerificationError('INVALID_PAYLOAD', 422, 'OneKhusa transactionAmount must be a valid MWK amount with at most two decimal places.');
    }
    const merchantReference = decodeSourceReferenceNumber(data.merchantReferenceNumber);
    const sourceReference = data.sourceReferenceNumber ? decodeSourceReferenceNumber(data.sourceReferenceNumber) : undefined;

    // Failed events carry no OneKhusa-side transaction reference, only our
    // own merchantReferenceNumber — fold in the timestamp so a genuine
    // retry (identical payload) still dedupes to the same eventId, while
    // two distinct failures for the same reference don't collide.
    const eventId = transactionReferenceNumber
      ? `${event}:${transactionReferenceNumber}`
      : `${event}:${data.merchantReferenceNumber}:${data.transactionDate}`;

    return {
      eventId,
      eventType: 'payment.status.changed',
      // Keep merchantReferenceNumber as the primary candidate for compatibility
      // with prior sandbox captures. The processor tries sourceReferenceNumber
      // if this value does not match a durable payment.
      paymentReference: merchantReference,
      paymentReferenceCandidates: sourceReference && sourceReference !== merchantReference ? [sourceReference] : undefined,
      // providerPaymentId stays in OneKhusa's own reference space (the
      // encoded form) — getPaymentStatus() calls back into OneKhusa with
      // this value directly, so it must be what OneKhusa itself recognizes.
      providerPaymentId: data.merchantReferenceNumber,
      status: oneKhusaStatusToGiantPay(data.transactionStatusCode),
      occurredAt,
      amountMinor,
    };
  }

  private webhookSecretForEvent(event: string): string | undefined {
    switch (event) {
      case 'pushpayment.success': return this.webhookSecretSuccess;
      case 'pushpayment.failed': return this.webhookSecretFailed;
      case 'pushpayment.reversed': return this.webhookSecretReversed;
      default: return undefined;
    }
  }

  // -------------------------------------------------------------------------
  // initiateRefund — no refund endpoint confirmed for OneKhusa.
  // -------------------------------------------------------------------------
  async initiateRefund(): Promise<never> {
    throw new Error(
      'OneKhusa refund execution is not implemented. Use GiantPay internal refund process.',
    );
  }
}
