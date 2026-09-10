import { test, expect } from '@playwright/test';

test.describe('Sign in and dashboard', () => {
  test('an approved merchant signs in (with MFA) and views the dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email address/i).fill('chikondi.banda@kambazapay.mw');
    await page.getByLabel(/^password$/i).fill('GiantPay!Demo1');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/verify it's you/i)).toBeVisible();
    const digits = page.getByLabel(/digit \d of 6/i);
    const code = '123456';
    for (let i = 0; i < code.length; i++) {
      await digits.nth(i).fill(code[i]);
    }
    await page.getByRole('button', { name: /^verify$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText('Total processed')).toBeVisible();
  });

  test('an unknown role/permission is blocked at the route level, not just hidden from nav', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('grace.phiri@kambazapay.mw');
    await page.getByLabel(/^password$/i).fill('GiantPay!Demo1');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Grace (VIEWER) has no payments.links:manage permission — direct URL
    // entry to a protected deep link must still be blocked server-side of
    // the UI decision, not merely absent from navigation.
    await page.goto('/payment-links/create');
    await expect(page.getByText(/don't have access/i)).toBeVisible();
  });
});
