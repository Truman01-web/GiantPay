import { describe, expect, it } from 'vitest';
import { pageMetadata } from './seo';
describe('public indexing allowlist', () => {
  it('assigns accurate public metadata without carrying a query or token', () => {
    expect(pageMetadata('/products/qr-payments')).toMatchObject({
      robots: 'index,follow',
      canonical: 'https://giantpay.mw/products/qr-payments',
    });
  });
  it.each([
    '/checkout/qr/synthetic-token',
    '/payment/private-reference',
    '/dashboard',
    '/admin',
    '/developers/api-keys',
    '/login',
    '/products/unknown',
  ])('keeps %s out of the index', (path) => {
    expect(pageMetadata(path)).toMatchObject({
      robots: 'noindex,nofollow,noarchive',
      canonical: null,
    });
  });
  it('does not index any staff portal route', () =>
    expect(pageMetadata('/', true).canonical).toBeNull());
});
