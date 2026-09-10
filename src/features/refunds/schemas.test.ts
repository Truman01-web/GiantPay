import { describe, expect, it } from 'vitest';
import { refundRequestSchema } from './schemas';

describe('refundRequestSchema', () => {
  const schema = refundRequestSchema(10000);

  it('accepts an amount within the refundable balance', () => {
    const result = schema.safeParse({ amountMinor: 5000, reason: 'Customer changed their mind' });
    expect(result.success).toBe(true);
  });

  it('rejects an amount above the backend-confirmed refundable balance', () => {
    const result = schema.safeParse({ amountMinor: 15000, reason: 'Duplicate charge' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    expect(schema.safeParse({ amountMinor: 0, reason: 'Duplicate charge' }).success).toBe(false);
    expect(schema.safeParse({ amountMinor: -100, reason: 'Duplicate charge' }).success).toBe(false);
  });

  it('requires a non-trivial reason', () => {
    const result = schema.safeParse({ amountMinor: 1000, reason: 'no' });
    expect(result.success).toBe(false);
  });
});
