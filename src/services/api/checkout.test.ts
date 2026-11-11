import { describe, expect, it } from 'vitest';
import { validateCheckoutSubmitResult } from './checkout';

describe('hosted checkout response validation', () => {
  it.each([undefined, {}, { reference: 'GP-test', checkoutUrl: 'javascript:alert(1)' }, { reference: 'GP-test', checkoutUrl: 'https://checkout.flutterwave.com.attacker.test/pay' }])('rejects invalid or unsafe response %o', (value) => {
    expect(() => validateCheckoutSubmitResult(value)).toThrow();
  });
  it('accepts a durable reference with uncertain outcome', () => {
    expect(validateCheckoutSubmitResult({ reference: 'GP-test', checkoutUrl: null })).toEqual({ reference: 'GP-test', checkoutUrl: null });
  });
});
