import { createHmac } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { totp } from '../server/src/team/security';

test('merchant signs in, creates a QR code and its customer sees success only after a signed backend callback', async ({ page, browser }) => {
  await page.goto('/scan-to-pay');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email address').fill('owner@example.test');
  await page.locator('input[type="password"]').fill('Synthetic-browser-password-26!');
  const login = page.waitForResponse(r => r.url().endsWith('/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect((await login).status()).toBe(200);
  await expect(page).toHaveURL(/\/scan-to-pay$/);
  await page.getByRole('link', { name: 'Create QR Code' }).click();
  await page.getByLabel('Label / Counter Name').fill('Acceptance Counter');
  await page.getByLabel(/^Amount/).fill('100');
  const creation = page.waitForResponse(r => r.url().endsWith('/v1/qr') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create QR Code', exact: true }).click();
  expect((await creation).status()).toBe(201);
  const checkoutUrl = await page.locator('#created-qr-checkout-url').inputValue();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Create Scan to Pay QR Code' })).toBeVisible();
  const guest = await browser.newContext();
  try {
    const checkout = await guest.newPage();
    await checkout.goto(checkoutUrl);
    await checkout.getByText('Mobile Money (Airtel / Mpamba)', { exact: true }).click();
    const submission = checkout.waitForResponse(r => r.url().endsWith('/submit') && r.request().method() === 'POST');
    await checkout.getByRole('button', { name: /Pay Now/ }).click();
    const response = await submission;
    expect(response.status()).toBe(202);
    const { reference } = await response.json();
    await expect(checkout.getByRole('heading', { name: 'Payment successful' })).toHaveCount(0);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const event = { eventId: `browser-${reference}`, eventType: 'payment.status.changed', paymentReference: reference, providerPaymentId: `synthetic-${reference}`, status: 'SUCCEEDED', occurredAt: new Date().toISOString() };
    const body = JSON.stringify(event);
    const signature = createHmac('sha256', 's'.repeat(32)).update(`${timestamp}.${body}`).digest('hex');
    const callback = await guest.request.post('http://127.0.0.1:4017/v1/webhooks/providers/sandbox', { data: body, headers: { 'Content-Type': 'application/json', 'x-giantpay-timestamp': timestamp, 'x-giantpay-signature': signature } });
    expect(callback.status()).toBe(202);
    await expect(checkout.getByRole('heading', { name: 'Payment successful' })).toBeVisible({ timeout: 20_000 });
    await page.goto('/scan-to-pay');
    await expect(page.getByText('Acceptance Counter', { exact: true })).toBeVisible();
  } finally { await guest.close(); }
});

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
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  const response = await page.request.get('http://127.0.0.1:4017/v1/staff/auth/session');
  expect(response.status()).toBe(401);
});
