import { describe, expect, it } from 'vitest';
import { isGiantPayQrUrl } from './checkoutUrl';
describe('safe QR targets', () => {
  const token = 'a'.repeat(43);
  it('accepts the current hosted or loopback frontend origin', () => {
    expect(isGiantPayQrUrl(`https://pay.example.test/checkout/qr/${token}`, 'https://pay.example.test')).toBe(true);
    expect(isGiantPayQrUrl(`http://127.0.0.1:4187/checkout/qr/${token}`, 'http://127.0.0.1:4187')).toBe(true);
  });
  it.each([
    `http://giantpay.mw/checkout/qr/${token}`,
    `https://evil.test/checkout/qr/${token}`,
    `https://giantpay.mw/checkout/qr/${token}?amount=100`,
    `https://giantpay.mw/checkout/qr/${token}#secret`,
    `https://user@giantpay.mw/checkout/qr/${token}`,
    'javascript:alert(1)',
    'https://giantpay.mw/checkout/qr/merchant-1',
  ])('refuses %s', (url) => expect(isGiantPayQrUrl(url, 'https://giantpay.mw')).toBe(false));
  it('rejects HTTP for non-loopback origins even when they match', () => expect(isGiantPayQrUrl(`http://evil.test/checkout/qr/${token}`, 'http://evil.test')).toBe(false));
});
