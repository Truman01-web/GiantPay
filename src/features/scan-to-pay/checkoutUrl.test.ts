import { describe, expect, it } from 'vitest';
import { isGiantPayQrUrl } from './checkoutUrl';
describe('safe QR targets', () => {
  const token = 'a'.repeat(43);
  it('accepts the HTTPS product checkout URL', () =>
    expect(isGiantPayQrUrl(`https://giantpay.mw/checkout/qr/${token}`)).toBe(true));
  it.each([
    `http://giantpay.mw/checkout/qr/${token}`,
    `https://evil.test/checkout/qr/${token}`,
    `https://giantpay.mw/checkout/qr/${token}?amount=100`,
    `https://giantpay.mw/checkout/qr/${token}#secret`,
    `https://user@giantpay.mw/checkout/qr/${token}`,
    'javascript:alert(1)',
    'https://giantpay.mw/checkout/qr/merchant-1',
  ])('refuses %s', (url) => expect(isGiantPayQrUrl(url)).toBe(false));
});
