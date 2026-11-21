/// <reference lib="dom" />
import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}px public acceptance`, () => {
    test.use({ viewport });
    test('public products, keyboard access and non-executable quote journey', async ({ page }) => {
      const failures: string[] = [];
      page.on('pageerror', (error) => failures.push(error.message));
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Malawi');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await page.keyboard.press('Enter');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.getByRole('heading', { level: 1 }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `test-results/home-${viewport.width}.png`, fullPage: true });
      await page.getByRole('link', { name: 'Explore QR payments', exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'QR payments for merchants in Malawi',
      );
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
        'href',
        'https://giantpay.mw/products/qr-payments',
      );
      await page.goto('/products/merchant-devices');
      const image = page.getByAltText(/Supplied Aisino/);
      await expect(image).toBeVisible();
      expect(
        await image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      ).toBeGreaterThan(0);
      await expect(page.getByText(/No terminal SDK/)).toBeVisible();
      await page.goto('/products/currency-exchange');
      await expect(
        page.getByText('Synthetic rates and fees · No live offer · No funds move'),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Calculate demonstration quote' }).click();
      await expect(page.getByText('20000.00 MWK', { exact: true })).toBeVisible();
      await expect(page.getByText('300.00 MWK', { exact: true })).toBeVisible();
      await expect(page.getByText('20300.00 MWK', { exact: true })).toBeVisible();
      await expect(page.getByText('10.00 USD', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Exchange execution disabled' }),
      ).toBeDisabled();
      await page.getByLabel('Source amount').fill('1e6');
      await expect(page.getByText('Demonstration ready — execution disabled')).toHaveCount(0);
      await page.getByRole('button', { name: 'Calculate demonstration quote' }).click();
      await expect(page.getByRole('alert')).toContainText('at most 2 decimal places');
      await page.getByLabel('Source amount').fill('20000');
      await page.clock.install();
      await page.getByRole('button', { name: 'Calculate demonstration quote' }).click();
      await page.clock.fastForward(61000);
      await expect(page.getByText('Expired — recalculate for another demonstration')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.getByRole('heading', { level: 1 }).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `test-results/exchange-${viewport.width}.png`,
        fullPage: true,
      });
      await page.goto('/company/contact');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Contact GiantPlus about GiantPay',
      );
      await expect(page.locator('form')).toHaveCount(0);
      await page.goto('/checkout/qr/unknown-synthetic-token');
      await expect(page.getByRole('heading', { name: 'Invalid QR Checkout Link' })).toBeVisible();
      await expect(page.locator('meta[name=robots]')).toHaveAttribute(
        'content',
        'noindex,nofollow,noarchive',
      );
      await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
      expect(failures).toEqual([]);
    });
    test('QR loading and network error stay actionable', async ({ page }) => {
      let release: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/v1/checkout/qr/synthetic-error', async (route) => {
        await gate;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Synthetic outage' } }),
        });
      });
      await page.goto('/checkout/qr/synthetic-error');
      await expect(page.getByText('Loading payment details…')).toBeVisible();
      release!();
      await expect(
        page.getByRole('heading', { name: 'Could not load payment details' }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Payment successful' })).toHaveCount(0);
    });
  });
}
