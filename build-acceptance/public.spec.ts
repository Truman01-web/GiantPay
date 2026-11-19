import { test, expect } from '@playwright/test';

test('built public products expose useful content and metadata without JavaScript', async ({
  page,
  request,
}) => {
  for (const [path, title] of [
    ['/', 'Payment gateway for Malawian businesses'],
    ['/products/qr-payments', 'QR payments for merchants in Malawi'],
    ['/products/currency-exchange', 'Currency exchange journey demonstration'],
    ['/developers/api-documentation', 'Sandbox payment API documentation'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page).toHaveTitle(title + ' | GiantPay');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      'https://giantpay.mw' + path,
    );
    expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
      'GiantPlus',
    );
  }
  const sitemap = await request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('https://giantpay.mw/products/qr-payments');
  expect(await sitemap.text()).not.toContain('/checkout/');
});

test('built private fallback is noindex before JavaScript and has no public canonical', async ({
  page,
}) => {
  for (const path of [
    '/dashboard',
    '/checkout/qr/synthetic-token?status=success',
    '/payment/synthetic-reference',
    '/admin',
  ]) {
    const response = await page.goto(path);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      'noindex,nofollow,noarchive',
    );
    await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Payment successful' })).toHaveCount(0);
  }
});
