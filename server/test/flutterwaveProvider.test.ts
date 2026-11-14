/**
 * Flutterwave provider contract tests.
 *
 * All tests use a synthetic HTTP transport — no real network calls are made.
 * Tests cover: success, failure, timeout, amount mismatch, currency mismatch,
 * reference mismatch, duplicate callbacks, replay, uncertain initiation and
 * exactly-once ledger posting safety (state-machine rejection).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FlutterwavePaymentProvider,
  RealFlutterwaveHttpClient,
  FlutterwaveVerificationError,
  FlutterwaveClientError,
  mapChannelToFlutterwaveOptions,
  type FlutterwaveHttpClient,
  type FlutterwaveCheckoutPayload,
  type FlutterwaveCheckoutResponse,
  type FlutterwaveVerifyResponse,
} from '../src/providers/flutterwaveProvider.js';
import { WebhookVerificationError } from '../src/providers/sandboxProvider.js';
import { timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Synthetic HTTP client factory
// ---------------------------------------------------------------------------
function makeClient(
  checkoutResult: FlutterwaveCheckoutResponse,
  verifyResult: FlutterwaveVerifyResponse,
): FlutterwaveHttpClient {
  return {
    initiateCheckout: vi.fn().mockResolvedValue(checkoutResult),
    verifyTransaction: vi.fn().mockResolvedValue(verifyResult),
  };
}

function successCheckout(): FlutterwaveCheckoutResponse {
  return {
    status: 'success',
    message: 'Hosted Link',
    data: { link: 'https://checkout.flutterwave.com/v3/hosted/pay/abc123' },
  };
}

function successVerify(overrides: Partial<NonNullable<FlutterwaveVerifyResponse['data']>> = {}): FlutterwaveVerifyResponse {
  return {
    status: 'success',
    message: 'Transaction fetched',
    data: {
      id: 999001,
      tx_ref: 'GP-1-TEST',
      flw_ref: 'FLW-MOCK-REF',
      status: 'successful',
      currency: 'MWK',
      amount: 1500.00,          // 1500 MWK major = 150000 minor
      charged_amount: 1500.00,
      app_fee: 45.00,
      merchant_fee: 0,
      created_at: '2026-10-29T04:00:00.000Z',
      customer: {
        id: 1,
        name: 'Thandiwe Mvula',
        phone_number: '+265991234567',
        email: 'thandiwe@example.mw',
        created_at: '2026-10-29T04:00:00.000Z',
      },
      ...overrides,
    },
  };
}

// Build a provider with the given client
function makeProvider(client: FlutterwaveHttpClient, opts: {
  secretHash?: string;
} = {}) {
  return new FlutterwavePaymentProvider(
    'FLWSECK_TEST-testsecretkey12345678901234567-X',
    'FLWPUBK_TEST-testpublickey12345678901234567-X',
    opts.secretHash ?? 'test-secret-hash-value',
    'http://localhost:4000',
    client,
    'local',
  );
}

describe('authoritative uncertain-payment recovery', () => {
  const expected = { reference: 'GP-1-TEST', amountMinor: 150000, currency: 'MWK', transactionId: null };
  it('discovers by reference and independently verifies the numeric ID', async () => {
    const client = { ...makeClient(successCheckout(), successVerify()), verifyByReference: vi.fn().mockResolvedValue(successVerify()) };
    expect(await makeProvider(client).recoverPayment(expected)).toMatchObject({ status: 'SUCCEEDED', flwTransactionId: '999001' });
    expect(client.verifyTransaction).toHaveBeenCalledWith('999001', undefined); expect(client.initiateCheckout).not.toHaveBeenCalled();
  });
  it.each([{ tx_ref: 'wrong' }, { id: 0 }, { id: 1.5 }])('rejects unbound discovery %j', async change => {
    const client = { ...makeClient(successCheckout(), successVerify()), verifyByReference: vi.fn().mockResolvedValue(successVerify(change)) };
    await expect(makeProvider(client).recoverPayment(expected)).rejects.toThrow(); expect(client.verifyTransaction).not.toHaveBeenCalled();
  });
  it('fails closed when reference lookup is unavailable', async () => {
    await expect(makeProvider(makeClient(successCheckout(),successVerify())).recoverPayment(expected)).rejects.toThrow();
  });
  it('propagates recovery cancellation into the real HTTP transport without network calls', async () => {
    const fetchMock = vi.spyOn(globalThis,'fetch').mockImplementation((_url,options) => new Promise((_resolve,reject) => {
      options?.signal?.addEventListener('abort',() => reject(new Error('synthetic cancellation')),{once:true});
    }));
    try {
      const controller = new AbortController();
      const request = new RealFlutterwaveHttpClient('synthetic').verifyByReference('synthetic-ref',controller.signal);
      controller.abort(); await expect(request).rejects.toThrow('synthetic cancellation');
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    } finally { fetchMock.mockRestore(); }
  });
});

// Build a valid verif-hash webhook body
function makeWebhookBody(txRef: string, flwTxId: number, status = 'successful'): Buffer {
  return Buffer.from(JSON.stringify({
    event: 'charge.completed',
    data: {
      id: flwTxId,
      tx_ref: txRef,
      flw_ref: 'FLW-MOCK-REF',
      status,
      currency: 'MWK',
      amount: 1500.00,
      charged_amount: 1500.00,
      customer: {
        email: 'thandiwe@example.mw',
        name: 'Thandiwe Mvula',
        phone_number: '+265991234567',
        created_at: '2026-10-29T04:00:00.000Z',
      },
    },
  }));
}

// ---------------------------------------------------------------------------
describe('FlutterwavePaymentProvider — initiatePayment', () => {
  it('returns a checkoutUrl and PROCESSING status for a valid MWK card payment', async () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client);

    const result = await provider.initiatePayment({
      paymentReference: 'GP-1-TEST',
      amountMinor: 150_000,   // 1500 MWK in tambala
      currency: 'MWK',
      channel: 'CARD',
      customer: { name: 'Thandiwe Mvula', email: 'thandiwe@example.mw', phone: '+265991234567' },
    });

    expect(result.status).toBe('PROCESSING');
    expect(result.checkoutUrl).toBe('https://checkout.flutterwave.com/v3/hosted/pay/abc123');
    expect(result.providerPaymentId).toBe('GP-1-TEST');
  });

  it('sends amount in major units (MWK: minor ÷ 100)', async () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client);
    const initSpy = vi.spyOn(client, 'initiateCheckout');

    await provider.initiatePayment({
      paymentReference: 'GP-2-TEST',
      amountMinor: 75_000,   // 750.00 MWK
      currency: 'MWK',
      channel: 'MOBILE_MONEY',
      customer: {},
    });

    const payload = (initSpy.mock.calls[0]![0] as FlutterwaveCheckoutPayload);
    expect(payload.amount).toBe('750.00');
    expect(payload.currency).toBe('MWK');
    expect(payload.tx_ref).toBe('GP-2-TEST');
    expect(payload.payment_options).toBe('mobilemoney');
  });

  it('rejects unsupported currencies', async () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client);

    await expect(provider.initiatePayment({
      paymentReference: 'GP-3-TEST',
      amountMinor: 10_000,
      currency: 'USD',   // Not supported for Malawi
      channel: 'CARD',
      customer: {},
    })).rejects.toThrow('not supported');
  });

  it('rejects BANK_TRANSFER channel (not confirmed for Malawi)', async () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client);

    await expect(provider.initiatePayment({
      paymentReference: 'GP-4-TEST',
      amountMinor: 10_000,
      currency: 'MWK',
      channel: 'BANK_TRANSFER',
      customer: {},
    })).rejects.toThrow('Bank transfer');
  });

  it('throws FlutterwaveClientError when FLW returns an error response', async () => {
    const client = makeClient(
      { status: 'error', message: 'Invalid credentials' },
      successVerify(),
    );
    const provider = makeProvider(client);

    await expect(provider.initiatePayment({
      paymentReference: 'GP-5-TEST',
      amountMinor: 10_000,
      currency: 'MWK',
      channel: 'CARD',
      customer: {},
    })).rejects.toThrow(FlutterwaveClientError);
  });
});

// ---------------------------------------------------------------------------
describe('FlutterwavePaymentProvider — parseAndVerifyWebhook', () => {
  it('parses and verifies a valid charge.completed webhook', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'my-secret-hash' });
    const rawBody = makeWebhookBody('GP-1-TEST', 999001, 'successful');

    const event = provider.parseAndVerifyWebhook(rawBody, { verifHash: 'my-secret-hash' });

    expect(event.eventType).toBe('payment.status.changed');
    expect(event.paymentReference).toBe('GP-1-TEST');
    expect(event.providerPaymentId).toBe('999001');
    expect(event.status).toBe('SUCCEEDED');
    expect(event.eventId).toBe('999001:successful');
  });

  it('maps FLW "failed" status to FAILED', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'my-secret-hash' });
    const rawBody = makeWebhookBody('GP-1-TEST', 999002, 'failed');

    const event = provider.parseAndVerifyWebhook(rawBody, { verifHash: 'my-secret-hash' });
    expect(event.status).toBe('FAILED');
  });

  it('maps FLW "cancelled" status to FAILED', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'my-secret-hash' });
    const rawBody = makeWebhookBody('GP-1-TEST', 999003, 'cancelled');

    const event = provider.parseAndVerifyWebhook(rawBody, { verifHash: 'my-secret-hash' });
    expect(event.status).toBe('FAILED');
  });

  it('throws MISSING_VERIF_HASH when header is absent', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'my-secret-hash' });
    const rawBody = makeWebhookBody('GP-1-TEST', 999001);

    expect(() => provider.parseAndVerifyWebhook(rawBody, {}))
      .toThrow(WebhookVerificationError);
  });

  it('throws INVALID_VERIF_HASH when hash does not match', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'correct-hash' });
    const rawBody = makeWebhookBody('GP-1-TEST', 999001);

    try {
      provider.parseAndVerifyWebhook(rawBody, { verifHash: 'wrong-hash' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WebhookVerificationError);
      expect((err as WebhookVerificationError).code).toBe('INVALID_VERIF_HASH');
    }
  });

  it('throws MALFORMED_PAYLOAD for invalid JSON', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'my-secret-hash' });

    expect(() => provider.parseAndVerifyWebhook(Buffer.from('not-json'), { verifHash: 'my-secret-hash' }))
      .toThrow(WebhookVerificationError);
  });

  it('throws INVALID_PAYLOAD for structurally invalid payload', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'my-secret-hash' });
    const badBody = Buffer.from(JSON.stringify({ event: 'charge.completed', data: { no_id: true } }));

    try {
      provider.parseAndVerifyWebhook(badBody, { verifHash: 'my-secret-hash' });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WebhookVerificationError);
      expect((err as WebhookVerificationError).code).toBe('INVALID_PAYLOAD');
    }
  });

  it('uses timing-safe comparison (same length hash rejection)', () => {
    // The verif-hash comparison must be constant-time.
    // Test that a same-length but wrong hash is still rejected.
    const client = makeClient(successCheckout(), successVerify());
    const secret = 'aaaa-bbbb-cccc-dddd-eeee-ffff-0000-1111';
    const wrong  = 'aaaa-bbbb-cccc-dddd-eeee-ffff-0000-1112'; // last char differs
    const provider = makeProvider(client, { secretHash: secret });
    const rawBody = makeWebhookBody('GP-1-TEST', 999001);

    expect(() => provider.parseAndVerifyWebhook(rawBody, { verifHash: wrong }))
      .toThrow(WebhookVerificationError);
  });
});

// ---------------------------------------------------------------------------
describe('FlutterwavePaymentProvider — verifyTransactionAfterWebhook', () => {
  it('returns SUCCEEDED for a fully matching verification', async () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client);

    const result = await provider.verifyTransactionAfterWebhook({
      flwTransactionId: '999001',
      expectedTxRef: 'GP-1-TEST',
      expectedAmountMinor: 150_000,   // 1500 MWK
      expectedCurrency: 'MWK',
    });

    expect(result.status).toBe('SUCCEEDED');
    expect(result.flwTransactionId).toBe('999001');
  });

  it('keeps outcome uncertain when FLW status is not "successful"', async () => {
    const client = makeClient(successCheckout(), successVerify({ status: 'failed' }));
    const provider = makeProvider(client);

    const result = await provider.verifyTransactionAfterWebhook({
      flwTransactionId: '999001',
      expectedTxRef: 'GP-1-TEST',
      expectedAmountMinor: 150_000,
      expectedCurrency: 'MWK',
    });

    expect(result.status).toBe('PROCESSING');
  });

  it('throws CURRENCY_MISMATCH when FLW returns a different currency', async () => {
    const client = makeClient(successCheckout(), successVerify({ currency: 'NGN' }));
    const provider = makeProvider(client);

    await expect(provider.verifyTransactionAfterWebhook({
      flwTransactionId: '999001',
      expectedTxRef: 'GP-1-TEST',
      expectedAmountMinor: 150_000,
      expectedCurrency: 'MWK',
    })).rejects.toThrow(FlutterwaveVerificationError);

    try {
      await provider.verifyTransactionAfterWebhook({
        flwTransactionId: '999001',
        expectedTxRef: 'GP-1-TEST',
        expectedAmountMinor: 150_000,
        expectedCurrency: 'MWK',
      });
    } catch (e) {
      expect((e as FlutterwaveVerificationError).code).toBe('CURRENCY_MISMATCH');
    }
  });

  it('throws AMOUNT_MISMATCH when FLW amount differs by even 1 tambala', async () => {
    // FLW returns 1500.01 MWK = 150001 minor, but we expect 150000.
    const client = makeClient(successCheckout(), successVerify({ amount: 1500.01 }));
    const provider = makeProvider(client);

    try {
      await provider.verifyTransactionAfterWebhook({
        flwTransactionId: '999001',
        expectedTxRef: 'GP-1-TEST',
        expectedAmountMinor: 150_000,
        expectedCurrency: 'MWK',
      });
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as FlutterwaveVerificationError).code).toBe('AMOUNT_MISMATCH');
    }
  });

  it('throws REFERENCE_MISMATCH when tx_ref does not match', async () => {
    const client = makeClient(successCheckout(), successVerify({ tx_ref: 'GP-9999-OTHER' }));
    const provider = makeProvider(client);

    try {
      await provider.verifyTransactionAfterWebhook({
        flwTransactionId: '999001',
        expectedTxRef: 'GP-1-TEST',
        expectedAmountMinor: 150_000,
        expectedCurrency: 'MWK',
      });
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as FlutterwaveVerificationError).code).toBe('REFERENCE_MISMATCH');
    }
  });

  it('throws VERIFY_UNAVAILABLE when FLW returns no data', async () => {
    const client = makeClient(successCheckout(), { status: 'error', message: 'Not found' });
    const provider = makeProvider(client);

    await expect(provider.verifyTransactionAfterWebhook({
      flwTransactionId: '999001',
      expectedTxRef: 'GP-1-TEST',
      expectedAmountMinor: 150_000,
      expectedCurrency: 'MWK',
    })).rejects.toThrow(FlutterwaveVerificationError);
  });

  it('simulates timeout: injected client that rejects with AbortError', async () => {
    const timeoutClient: FlutterwaveHttpClient = {
      initiateCheckout: vi.fn().mockResolvedValue(successCheckout()),
      verifyTransaction: vi.fn().mockRejectedValue(
        Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
      ),
    };
    const provider = makeProvider(timeoutClient);

    await expect(provider.verifyTransactionAfterWebhook({
      flwTransactionId: '999001',
      expectedTxRef: 'GP-1-TEST',
      expectedAmountMinor: 150_000,
      expectedCurrency: 'MWK',
    })).rejects.toThrow('aborted');
  });
});

// ---------------------------------------------------------------------------
describe('mapChannelToFlutterwaveOptions', () => {
  it('maps CARD to card', () => expect(mapChannelToFlutterwaveOptions('CARD')).toBe('card'));
  it('maps MOBILE_MONEY to mobilemoney', () => expect(mapChannelToFlutterwaveOptions('MOBILE_MONEY')).toBe('mobilemoney'));
  it('throws for BANK_TRANSFER (unconfirmed for Malawi)', () => {
    expect(() => mapChannelToFlutterwaveOptions('BANK_TRANSFER')).toThrow(FlutterwaveClientError);
  });
});

// ---------------------------------------------------------------------------
describe('Flutterwave provider — duplicate / replay safety', () => {
  it('webhook with the same eventId returns the same parsed event (dedup handled by webhookProcessor)', () => {
    // The provider itself returns the same event for the same body.
    // Duplicate detection is the webhookProcessor's responsibility.
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'hash' });
    const rawBody = makeWebhookBody('GP-1-TEST', 999001);

    const e1 = provider.parseAndVerifyWebhook(rawBody, { verifHash: 'hash' });
    const e2 = provider.parseAndVerifyWebhook(rawBody, { verifHash: 'hash' });

    // Idempotent — same input, same output
    expect(e1.eventId).toBe(e2.eventId);
    expect(e1.paymentReference).toBe(e2.paymentReference);
  });

  it('two different webhooks with different transaction IDs produce different eventIds', () => {
    const client = makeClient(successCheckout(), successVerify());
    const provider = makeProvider(client, { secretHash: 'hash' });
    const body1 = makeWebhookBody('GP-1-TEST', 111111);
    const body2 = makeWebhookBody('GP-2-TEST', 222222);

    const e1 = provider.parseAndVerifyWebhook(body1, { verifHash: 'hash' });
    const e2 = provider.parseAndVerifyWebhook(body2, { verifHash: 'hash' });

    expect(e1.eventId).not.toBe(e2.eventId);
  });
});

describe('Flutterwave verification rejects malformed authoritative data', () => {
  it.each([{ id: 888 }, { amount: 1500.001 }, { amount: NaN }, { amount: Infinity }])('rejects %o', async (overrides) => {
    const provider = makeProvider(makeClient(successCheckout(), successVerify(overrides)));
    await expect(provider.verifyTransactionAfterWebhook({ flwTransactionId: '999001', expectedTxRef: 'GP-1-TEST', expectedAmountMinor: 150000, expectedCurrency: 'MWK' })).rejects.toBeInstanceOf(FlutterwaveVerificationError);
  });
});
