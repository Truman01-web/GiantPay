/// <reference lib="dom" />
import jsQR from 'jsqr';
import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { totp } from '../server/src/team/security';

for (const width of [1440, 390]) {
  test.describe(`${width}px merchant QR journey`, () => {
    test.use({ viewport: { width, height: 1000 } });
    test('merchant signs in, creates a QR code and its customer sees success only after a signed backend callback', async ({
      page,
      browser,
    }) => {
      await page.goto('/scan-to-pay');
      await expect(page).toHaveURL(/\/login/);
      await page.getByLabel('Email address').fill('owner@example.test');
      await page.locator('input[type="password"]').fill('Synthetic-browser-password-26!');
      const login = page.waitForResponse(
        (r) => r.url().endsWith('/v1/auth/login') && r.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      expect((await login).status()).toBe(200);
      await expect(page).toHaveURL(/\/scan-to-pay$/);
      await page.getByRole('link', { name: 'Create QR Code' }).click();
      const counterName = 'Acceptance Counter ' + width + '-' + Date.now();
      await page.getByLabel('Label / Counter Name').fill(counterName);
      await page.getByLabel(/^Amount/).fill('100');
      const creation = page.waitForResponse(
        (r) => r.url().endsWith('/v1/qr') && r.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Create QR Code', exact: true }).click();
      expect((await creation).status()).toBe(201);
      const checkoutUrl = await page.locator('#created-qr-checkout-url').inputValue();
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PNG' }).click();
      const artifact = await downloaded;
      const { readFile } = await import('node:fs/promises');
      const dataUrl =
        'data:image/png;base64,' + (await readFile((await artifact.path())!)).toString('base64');
      const raster = await page.evaluate(async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return {
          width: image.width,
          height: image.height,
          data: Array.from(context.getImageData(0, 0, image.width, image.height).data),
        };
      }, dataUrl);
      expect(jsQR(new Uint8ClampedArray(raster.data), raster.width, raster.height)?.data).toBe(
        checkoutUrl,
      );
      await page.getByRole('button', { name: 'View Counter Stand', exact: true }).click();
      await expect(page.getByRole('img', { name: 'GiantPay', exact: true })).toBeVisible();
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.qr-print-area').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'QR Code Created' })).toBeHidden();
      await page.screenshot({ path: `test-results/qr-print-${width}.png`, fullPage: true });
      await page.emulateMedia({ media: 'screen' });
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Create Scan to Pay QR Code' })).toBeVisible();
      const guest = await browser.newContext({ viewport: { width, height: 1000 } });
      try {
        const checkout = await guest.newPage();
        expect(checkoutUrl).toMatch(/^https:\/\/giantpay\.mw\/checkout\/qr\/[A-Za-z0-9_-]{43}$/);
        await checkout.goto(new URL(checkoutUrl).pathname);
        await checkout.getByText('Mobile Money (Airtel / Mpamba)', { exact: true }).click();
        const submission = checkout.waitForResponse(
          (r) => r.url().endsWith('/submit') && r.request().method() === 'POST',
        );
        await checkout.getByRole('button', { name: /Pay Now/ }).click();
        const response = await submission;
        expect(response.status()).toBe(202);
        const { reference } = await response.json();
        await expect(checkout.getByRole('heading', { name: 'Payment successful' })).toHaveCount(0);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const event = {
          eventId: `browser-${reference}`,
          eventType: 'payment.status.changed',
          paymentReference: reference,
          providerPaymentId: `synthetic-${reference}`,
          status: 'SUCCEEDED',
          occurredAt: new Date().toISOString(),
        };
        const body = JSON.stringify(event);
        const signature = createHmac('sha256', 's'.repeat(32))
          .update(`${timestamp}.${body}`)
          .digest('hex');
        const callback = await guest.request.post(
          'http://127.0.0.1:4017/v1/webhooks/providers/sandbox',
          {
            data: body,
            headers: {
              'Content-Type': 'application/json',
              'x-giantpay-timestamp': timestamp,
              'x-giantpay-signature': signature,
            },
          },
        );
        expect(callback.status()).toBe(202);
        await expect(checkout.getByRole('heading', { name: 'Payment successful' })).toBeVisible({
          timeout: 20_000,
        });
        await page.goto('/scan-to-pay');
        await expect(page.getByText(counterName, { exact: true })).toBeVisible();
      } finally {
        await guest.close();
      }
    });
  });
}

test('staff signs in through MFA, restores its session and signs out', async ({ page }) => {
  await page.goto('http://127.0.0.1:4188/admin');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Staff email').fill('browser-review@giantplus-mw.com');
  await page.locator('input[type="password"]').fill('Synthetic-browser-password-26!');
  await page.getByRole('button', { name: 'Continue securely' }).click();
  await page.getByLabel('Authenticator code').fill(totp('JBSWY3DPEHPK3PXP').code);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.reload();
  await expect(page.getByText('Browser Staff', { exact: true })).toBeVisible();
  await page.goto('http://127.0.0.1:4187/login');
  const crossPortalStatus = await page.evaluate(
    async () =>
      (await fetch('http://127.0.0.1:4017/v1/staff/auth/session', { credentials: 'include' }))
        .status,
  );
  expect(crossPortalStatus).toBe(403);
  await page.goto('http://127.0.0.1:4188/admin');
  await expect(page.getByText('Browser Staff', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  const response = await page.request.get('http://127.0.0.1:4017/v1/staff/auth/session');
  expect(response.status()).toBe(401);
});
