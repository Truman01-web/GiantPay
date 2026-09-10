import { test, expect } from '@playwright/test';

test.describe('Hosted checkout', () => {
  test('customer completes checkout and the frontend waits for the backend-confirmed status before showing success', async ({ page }) => {
    await page.goto('/checkout/demo_token_ready');

    await expect(page.getByText('Paying Kambaza Traders')).toBeVisible();
    await page.getByLabel('Mobile money').check();
    await page.getByLabel(/full name/i).fill('Thandiwe Mvula');
    await page.getByLabel(/phone number/i).fill('+265 991 234 567');

    await page.getByRole('button', { name: /^pay/i }).click();

    // Immediately after submit the mock backend reports PROCESSING — the
    // page must show an in-progress state, never an optimistic success.
    await expect(page.getByRole('heading', { name: /confirming your payment/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /payment successful/i })).not.toBeVisible();

    // The mock backend resolves to SUCCESS ~3s after submit; the page
    // must only show success once it re-fetches the trusted status.
    await expect(page.getByRole('heading', { name: /payment successful/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/GiantPay reference/i)).toBeVisible();
  });

  test('an expired checkout session is never presented as payable', async ({ page }) => {
    await page.goto('/checkout/demo_token_expired');
    await expect(page.getByText(/session expired/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^pay/i })).not.toBeVisible();
  });
});
