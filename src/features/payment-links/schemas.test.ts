import { describe, expect, it } from 'vitest';
import { createPaymentLinkSchema } from './schemas';

const base = {
  name: 'Invoice link',
  currency: 'MWK',
  description: '',
  customerReference: '',
  reusable: false,
  maxSuccessfulPayments: 1 as number | null,
  expiresAt: '',
  redirectUrl: '',
};

describe('createPaymentLinkSchema', () => {
  it('requires an amount for a FIXED-mode link', () => {
    const result = createPaymentLinkSchema.safeParse({ ...base, mode: 'FIXED', amountMinor: null });
    expect(result.success).toBe(false);
  });

  it('accepts a FIXED-mode link with a positive amount', () => {
    const result = createPaymentLinkSchema.safeParse({ ...base, mode: 'FIXED', amountMinor: 150000 });
    expect(result.success).toBe(true);
  });

  it('does not require an amount for a CUSTOMER_ENTERED link', () => {
    const result = createPaymentLinkSchema.safeParse({ ...base, mode: 'CUSTOMER_ENTERED', amountMinor: null });
    expect(result.success).toBe(true);
  });

  it('rejects a single-use link with more than one max successful payment', () => {
    const result = createPaymentLinkSchema.safeParse({ ...base, mode: 'FIXED', amountMinor: 1000, reusable: false, maxSuccessfulPayments: 5 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid redirect URL', () => {
    const result = createPaymentLinkSchema.safeParse({ ...base, mode: 'FIXED', amountMinor: 1000, redirectUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});
