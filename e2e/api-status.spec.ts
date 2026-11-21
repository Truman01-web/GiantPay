import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';

test('footer, keyboard refresh, announcements and responsive layout', async ({ page }) => {
  await page.route('http://127.0.0.1:4499/v1/health/**', async (route) => {
    await route.fulfill({ headers: { 'access-control-allow-origin': 'http://127.0.0.1:4178', 'content-type': 'application/json' }, body: JSON.stringify({ status: route.request().url().endsWith('/live') ? 'alive' : 'ready' }) });
  });
  await page.goto('/');
  const footerLink = page.getByRole('contentinfo').getByRole('link', { name: /API Status/ });
  await expect(footerLink).toContainText('Operational');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contact' }).focus();
  await page.keyboard.press('Tab');
  await expect(footerLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/status$/);
  const status = page.getByRole('status');
  await expect(status).toHaveText('Operational');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  const refresh = page.getByRole('button', { name: /refresh status/i });
  for (let i = 0; i < 80 && !(await refresh.evaluate((element) => element === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(refresh).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status).toHaveText('Operational');
  await expect(refresh).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('CORS and network failures cannot establish an outage; refresh recovers', async ({ page }) => {
  let mode: 'cors' | 'network' | 'healthy' = 'cors';
  const server = createServer((request, response) => {
    if (mode === 'network') { request.socket.destroy(); return; }
    if (mode === 'healthy') response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4178');
    response.setHeader('Content-Type', 'application/json');
    response.statusCode = mode === 'cors' ? 503 : 200;
    response.end(JSON.stringify({ status: mode === 'cors' ? 'unavailable' : request.url?.endsWith('/live') ? 'alive' : 'ready' }));
  });
  await new Promise<void>((resolve) => server.listen(4499, '127.0.0.1', resolve));
  try {
    await page.goto('/status');
    await expect(page.getByText(/Last check:/)).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Unable to verify');
    mode = 'network';
    await page.getByRole('button', { name: /refresh status/i }).click();
    await expect(page.getByRole('button', { name: /refresh status/i })).toHaveAttribute('aria-disabled', 'false');
    await expect(page.getByRole('status')).toContainText('Unable to verify');
    mode = 'healthy';
    await page.getByRole('button', { name: /refresh status/i }).click();
    await expect(page.getByRole('status')).toHaveText('Operational');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
