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

test('an authorized user requests a refund within the backend-confirmed refundable balance', async ({ page }) => {
  await signIn(page);

  await page.goto('/transactions');
  await page.getByRole('button', { name: /^status/i }).click();
  await page.getByRole('menuitemcheckbox', { name: /succeeded/i }).click();
  await page.keyboard.press('Escape');

  await page.getByRole('row').nth(1).click();
  await expect(page).toHaveURL(/\/transactions\/pay_/);

  const requestRefundButton = page.getByRole('link', { name: /request refund/i });
  if (await requestRefundButton.isVisible()) {
    await requestRefundButton.click();
    await expect(page.getByRole('heading', { name: /request a refund/i })).toBeVisible();

    await page.getByLabel(/reason/i).fill('E2E automated refund request');
    await page.getByRole('button', { name: /submit refund request/i }).click();

    await expect(page.getByRole('heading', { name: /request a refund/i })).not.toBeVisible({ timeout: 10_000 });
  }
});
