import { describe, expect, it, vi } from 'vitest';
import { initiateCheckout } from '../src/payments/initiateCheckout.js';
import type { Db } from '../src/db.js';
import type { PaymentProvider } from '../src/providers/types.js';

describe('durable checkout intent', () => {
  it('commits before I/O and replays an uncertain outcome without charging again', async () => {
    let saved: any = null, committed = false;
    const query = vi.fn(async (sql: string, values?: any[]) => {
      if (sql === 'COMMIT') committed = true;
      if (sql.startsWith('SELECT response_body')) return { rowCount: saved ? 1 : 0, rows: saved ? [{ response_body: saved }] : [] };
      if (sql.startsWith('SELECT * FROM payment_links')) return { rowCount: 1, rows: [{ status: 'ACTIVE', reusable: true }] };
      if (sql.startsWith('INSERT INTO idempotency_keys')) saved = values![3];
      return { rowCount: 1, rows: [] };
    });
    const db = { connect: async () => ({ query, release: vi.fn() }) } as unknown as Db;
    const provider = { name: 'flutterwave', initiatePayment: vi.fn(async () => { expect(committed).toBe(true); throw new Error('lost response'); }) } as unknown as PaymentProvider;
    const input = { merchantId: 'm', sourceId: 'link', kind: 'checkout' as const, key: 'retry-key', amountMinor: 1000, currency: 'MWK', feeMinor: 30, description: null, channel: 'CARD' as const, customer: {} };
    const first = await initiateCheckout(db, provider, input);
    expect(first.reference).toBeTruthy();
    expect(first.checkoutUrl).toBeNull();
    expect(await initiateCheckout(db, provider, input)).toEqual(first);
    expect(provider.initiatePayment).toHaveBeenCalledTimes(1);
    await expect(initiateCheckout(db, provider, { ...input, amountMinor: 2000 })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(provider.initiatePayment).toHaveBeenCalledTimes(1);
  });

  it('runs deterministic provider validation before opening a transaction or reserving an intent', async () => {
    const connect = vi.fn();
    const db = { connect } as unknown as Db;
    const provider = {
      name: 'onekhusa', initiatePayment: vi.fn(),
      validatePaymentInput: vi.fn(() => { throw Object.assign(new Error('minimum amount'), { code: 'PROVIDER_VALIDATION', statusCode: 422 }); }),
    } as unknown as PaymentProvider;
    await expect(initiateCheckout(db, provider, {
      merchantId: 'm', sourceId: 'link', kind: 'checkout', key: 'low-amount', amountMinor: 49_999,
      currency: 'MWK', feeMinor: 0, description: null, channel: 'MOBILE_MONEY', customer: { phone: '+265991234567' },
    })).rejects.toMatchObject({ code: 'PROVIDER_VALIDATION', statusCode: 422 });
    expect(connect).not.toHaveBeenCalled();
    expect(provider.initiatePayment).not.toHaveBeenCalled();
  });
});
