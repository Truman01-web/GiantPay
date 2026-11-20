import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  OneKhusaPaymentProvider,
  type OneKhusaHttpClient,
  type OneKhusaTransactionStatusResponse,
} from '../src/providers/oneKhusaProvider.js';

const token = { accessToken: 'synthetic-token', expiresOn: '2099-01-01T00:00:00Z', expiryInMinutes: 5 };
const transactionStatus = (overrides: Partial<OneKhusaTransactionStatusResponse> = {}): OneKhusaTransactionStatusResponse => ({
  beneficiary: { accountNumber: 1, accountName: 'Synthetic', amountReceived: 500, currencyCode: 'MWK' },
  source: { accountNumber: '0990000000', customerName: 'Synthetic', amountSent: 500, currencyCode: 'MWK', sourceReferenceNumber: 'MYREF12345', connectorId: 1, connectorName: 'Airtel' },
  transaction: { transactionReferenceNumber: 'TX-SYNTHETIC', transactionFee: 0, transactionDescription: 'Synthetic', transactionDate: '2026-11-20T12:00:00Z', transactionStatusCode: 'S', transactionStatusName: 'Success', responseCode: 'S100', responseMessage: 'Synthetic success' },
  ...overrides,
});

function setup() {
  const client: OneKhusaHttpClient = {
    getAccessToken: vi.fn().mockResolvedValue(token),
    initiatePushPayment: vi.fn().mockResolvedValue({ merchantAccountNumber: 12345678, sourceReferenceNumber: 'MYREF12345', responseCode: 'I100', feeRuleCode: 'CM', transactionAmount: 500, totalCharges: 0, amountToPay: 500 }),
    inquireTransactionStatus: vi.fn().mockResolvedValue(transactionStatus()),
  };
  const provider = new OneKhusaPaymentProvider('key', 'secret', 'org', 12345678, 112400, 112500, 'test@example.invalid', 'success-secret', 'failure-secret', 'reversal-secret', client);
  return { provider, client };
}

function signed(payload: Record<string, unknown>, event: string, secret: string) {
  const raw = Buffer.from(JSON.stringify(payload));
  return { raw, signature: createHmac('sha512', secret).update(raw).digest('hex') };
}

const payload = (status: 'S' | 'F' | 'R' = 'S', extras: Record<string, unknown> = {}) => ({
  merchantReferenceNumber: 'MYREF12345',
  sourceReferenceNumber: 'KHUSA67890',
  transactionReferenceNumber: 'TX-SYNTHETIC',
  transactionAmount: 500,
  transactionDate: '2026-11-20T12:00:00+02:00',
  transactionStatusCode: status,
  responseCode: status === 'F' ? 'E307' : 'S100',
  ...extras,
});

describe('OneKhusa payment provider', () => {
  it('preflights supported channel, currency, minimum amount, phone and network before checkout reservation', () => {
    const { provider } = setup();
    const input = { paymentReference: 'GP_0123456789abcdef0123456789abcdef', amountMinor: 50_000, currency: 'MWK', channel: 'MOBILE_MONEY' as const, customer: { phone: '+265991234567' } };
    expect(() => provider.validatePaymentInput(input)).not.toThrow();
    expect(() => provider.validatePaymentInput({ ...input, channel: 'CARD' })).toThrow(/Only MOBILE_MONEY/);
    expect(() => provider.validatePaymentInput({ ...input, amountMinor: 49_999 })).toThrow(/minimum amount/);
    expect(() => provider.validatePaymentInput({ ...input, currency: 'USD' })).toThrow(/not supported/);
    expect(() => provider.validatePaymentInput({ ...input, customer: {} })).toThrow(/phone number/);
    expect(() => provider.validatePaymentInput({ ...input, customer: { phone: '+265991234567' }, paymentReference: 'x' })).toThrow(/5-25/);
    expect(() => provider.validatePaymentInput({ ...input, customer: { phone: '+265991234567' }, paymentReference: 'GP_0123456789abcdef0123456789abcdef', amountMinor: 50_000 })).not.toThrow();
    expect(() => provider.validatePaymentInput({ ...input, customer: { phone: '+265771234567' } })).toThrow(/unrecognized prefix/);
  });

  it('dispatches only a push prompt and keeps the payment processing until an asynchronous callback', async () => {
    const { provider, client } = setup();
    const response = await provider.initiatePayment({ paymentReference: 'GP_0123456789abcdef0123456789abcdef', amountMinor: 50_000, currency: 'MWK', channel: 'MOBILE_MONEY', customer: { phone: '+265991234567' } });
    expect(response.status).toBe('PROCESSING');
    expect(response.checkoutUrl).toBeUndefined();
    expect(client.initiatePushPayment).toHaveBeenCalledWith(expect.objectContaining({ transactionAmount: 500, payerAccountNumber: '265991234567' }), 'synthetic-token', expect.stringMatching(/^giantpay-[a-f0-9]{32}$/));
  });

  it('round-trips GiantPay references through a marked OneKhusa source reference', async () => {
    const { provider, client } = setup();
    const paymentReference = 'GP_0123456789abcdef0123456789abcdef';
    await provider.initiatePayment({ paymentReference, amountMinor: 50_000, currency: 'MWK', channel: 'MOBILE_MONEY', customer: { phone: '+265991234567' } });
    const submittedReference = (client.initiatePushPayment as ReturnType<typeof vi.fn>).mock.calls[0]![0].sourceReferenceNumber as string;
    expect(submittedReference).toMatch(/^GPX[0-9A-Za-z]{21,22}$/);
    expect(submittedReference.length).toBeLessThanOrEqual(25);
    const body = signed(payload('S', { merchantReferenceNumber: 'OTHER-MERCHANT-REF', sourceReferenceNumber: submittedReference }), 'pushpayment.success', 'success-secret');
    expect(provider.parseAndVerifyWebhook(body.raw, { event: 'pushpayment.success', signature: body.signature })).toMatchObject({
      paymentReference: 'OTHER-MERCHANT-REF', paymentReferenceCandidates: [paymentReference],
    });
  });

  it.each([
    ['success', 'pushpayment.success', 'success-secret', 'S', 'SUCCEEDED'],
    ['failure', 'pushpayment.failed', 'failure-secret', 'F', 'FAILED'],
    ['reversal', 'pushpayment.reversed', 'reversal-secret', 'R', 'REFUNDED'],
  ] as const)('parses signed %s callbacks and retains both reference fields', (_name, event, secret, status, expectedStatus) => {
    const { provider } = setup();
    const fixture = signed(payload(status), event, secret);
    const result = provider.parseAndVerifyWebhook(fixture.raw, { event, signature: fixture.signature });
    expect(result).toMatchObject({
      paymentReference: 'MYREF12345', paymentReferenceCandidates: ['KHUSA67890'],
      providerPaymentId: 'MYREF12345', status: expectedStatus, amountMinor: 50_000,
    });
    expect(result.occurredAt).toBe('2026-11-20T10:00:00.000Z');
  });

  it('deduplicates an identical signed callback and rejects malformed dates, decimal precision and wrong signatures', () => {
    const { provider } = setup();
    const fixture = signed(payload(), 'pushpayment.success', 'success-secret');
    const first = provider.parseAndVerifyWebhook(fixture.raw, { event: 'pushpayment.success', signature: fixture.signature });
    const retry = provider.parseAndVerifyWebhook(fixture.raw, { event: 'pushpayment.success', signature: fixture.signature });
    expect(retry.eventId).toBe(first.eventId);
    for (const invalid of [payload('S', { transactionDate: 'not-a-date' }), payload('S', { transactionAmount: 500.001 })]) {
      const body = signed(invalid, 'pushpayment.success', 'success-secret');
      expect(() => provider.parseAndVerifyWebhook(body.raw, { event: 'pushpayment.success', signature: body.signature })).toThrow();
    }
    expect(() => provider.parseAndVerifyWebhook(fixture.raw, { event: 'pushpayment.success', signature: '00'.repeat(64) })).toThrow();
  });

  it('leaves timed out and rejected provider initiation visible as errors for the durable checkout wrapper to treat as uncertain', async () => {
    const { provider, client } = setup();
    client.initiatePushPayment = vi.fn().mockRejectedValueOnce(new Error('synthetic timeout'));
    const input = { paymentReference: 'GP_0123456789abcdef0123456789abcdef', amountMinor: 50_000, currency: 'MWK', channel: 'MOBILE_MONEY' as const, customer: { phone: '+265991234567' } };
    await expect(provider.initiatePayment(input)).rejects.toThrow('synthetic timeout');
    client.initiatePushPayment = vi.fn().mockResolvedValueOnce({ merchantAccountNumber: 12345678, sourceReferenceNumber: 'MYREF12345', responseCode: 'E900', feeRuleCode: 'CM', transactionAmount: 500, totalCharges: 0, amountToPay: 500 });
    await expect(provider.initiatePayment(input)).rejects.toThrow(/initiation failed/);
  });

  it('recovers by inquiry only when the provider confirms the exact source reference, amount and currency', async () => {
    const { provider, client } = setup();
    const expected = { reference: 'MYREF12345', amountMinor: 50_000, currency: 'MWK', transactionId: null };
    expect(await provider.recoverPayment(expected)).toMatchObject({ providerPaymentId: 'MYREF12345', status: 'SUCCEEDED' });
    client.inquireTransactionStatus = vi.fn().mockResolvedValue(transactionStatus({ transaction: { ...transactionStatus().transaction, transactionStatusCode: 'F', responseCode: 'E307' } }));
    expect(await provider.recoverPayment(expected)).toMatchObject({ status: 'FAILED' });
    client.inquireTransactionStatus = vi.fn().mockResolvedValue(transactionStatus({ transaction: { ...transactionStatus().transaction, transactionStatusCode: 'R', responseCode: 'S100' } }));
    expect(await provider.recoverPayment(expected)).toMatchObject({ status: 'PROCESSING' });
    client.inquireTransactionStatus = vi.fn().mockResolvedValue(transactionStatus({ source: { ...transactionStatus().source, amountSent: 501 } }));
    await expect(provider.recoverPayment(expected)).rejects.toThrow(/did not match/);
    client.inquireTransactionStatus = vi.fn().mockResolvedValue(transactionStatus({ source: { ...transactionStatus().source, currencyCode: 'USD' } }));
    await expect(provider.recoverPayment(expected)).rejects.toThrow(/did not match/);
  });
});
