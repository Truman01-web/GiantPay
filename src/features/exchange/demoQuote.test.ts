import { describe, expect, it } from 'vitest';
import { createDemoQuote, demoQuoteStatus, parseDemoAmount } from './demoQuote';

describe('non-executable decimal-safe demonstration quotes', () => {
  it('calculates exact amounts and fees without floating point', () => {
    expect(createDemoQuote('20000.01', 'MWK', 'USD', 1000)).toMatchObject({
      sourceMinor: 2000001n,
      destinationMinor: 1000n,
      feeMinor: 30000n,
      totalMinor: 2030001n,
      rate: '0.000500',
      expiresAt: 61000,
      kind: 'SYNTHETIC_DEMO',
    });
  });
  it('rounds half up to destination minor units', () => {
    expect(createDemoQuote('10.00', 'MWK', 'USD', 0).destinationMinor).toBe(1n);
    expect(createDemoQuote('1.00', 'USD', 'MWK', 0).destinationMinor).toBe(200000n);
  });
  it.each(['0', '-1', '1e5', 'NaN', '0.001', '1,000', '9999999999', 'Infinity'])(
    'rejects invalid input %s',
    (amount) => expect(() => parseDemoAmount(amount)).toThrow(),
  );
  it('rejects identical currencies and zero-valued destination', () => {
    expect(() => createDemoQuote('1', 'MWK', 'MWK', 0)).toThrow();
    expect(() => createDemoQuote('0.01', 'MWK', 'USD', 0)).toThrow();
  });
  it('expires exactly at the deadline', () => {
    expect(demoQuoteStatus(60000, 59999)).toBe('DEMONSTRATION_READY');
    expect(demoQuoteStatus(60000, 60000)).toBe('EXPIRED');
  });
});
