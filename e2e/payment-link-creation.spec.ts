import { test, expect } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill('chikondi.banda@kambazapay.mw');
  await page.getByLabel(/^password$/i).fill('GiantPay!Demo1');
  await page.getByRole('button', { name: /sign in/i }).click();
  const digits = page.getByLabel(/digit \d of 6/i);
  for (let i = 0; i < 6; i++) await digits.nth(i).fill('123456'[i]);
  await page.getByRole('button', { name: /^verify$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('merchant creates a fixed-amount payment link', async ({ page }) => {
  await signIn(page);

  await page.goto('/payment-links/create');
  await page.getByLabel(/link name/i).fill('E2E test invoice');
  await page.getByLabel(/^amount$/i).fill('25000');
  await page.getByRole('button', { name: /create link/i }).click();

  await expect(page.getByRole('heading', { name: /payment link created/i })).toBeVisible();
  await expect(page.getByText(/pay\.giantpay\.mw/i)).toBeVisible();

  await page.getByRole('button', { name: /view link details/i }).click();
  await expect(page.getByRole('heading', { name: 'E2E test invoice' })).toBeVisible();
});
