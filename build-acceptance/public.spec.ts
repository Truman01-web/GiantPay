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

test.describe('merged public hero and navigation', () => {
  test.use({ javaScriptEnabled: true });
  test('preserves accurate product copy with the shared hero and click-only navigation', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.route('**/v1/auth/session', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Synthetic guest' } }),
      }),
    );
    for (const path of [
      '/pricing',
      '/developers/api-documentation',
      '/developers/collections-api',
      '/developers/disbursements-api',
      '/developers/overview',
      '/developers/sandbox',
      '/developers/sdks',
      '/developers/webhooks-api',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'GiantPay / Products & resources', exact: true }),
      ).toBeVisible();
    }
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sandbox payment pricing');
    await expect(page.getByText(/No uptime or settlement SLA is offered here/)).toBeVisible();
    const products = page.getByRole('button', { name: 'Products', exact: true });
    await products.hover();
    await expect(products).toHaveAttribute('aria-expanded', 'false');
    await products.click();
    await expect(page.getByRole('menuitem', { name: /QR Payments/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(products).toBeFocused();
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    );
    await expect(page.getByText('Email: info@giantplus-mw.com', { exact: true })).toBeVisible();
  });
});
