import { defineConfig } from '@playwright/test';

if (!process.env.TEST_DATABASE_URL || !process.env.TEST_REDIS_URL) throw new Error('Disposable PostgreSQL and Redis are required for API browser acceptance.');
const env = { TEST_DATABASE_URL: process.env.TEST_DATABASE_URL, TEST_REDIS_URL: process.env.TEST_REDIS_URL };
export default defineConfig({
  testDir: './browser-acceptance',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  outputDir: 'test-results/api-acceptance',
  use: { baseURL: 'http://127.0.0.1:4187', browserName: 'chromium', channel: process.platform === 'win32' ? 'msedge' : undefined, trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm --dir server exec tsx test/browserAcceptanceServer.ts', url: 'http://127.0.0.1:4017/v1/health/live', env, timeout: 120_000 },
    { command: 'pnpm exec vite --host 127.0.0.1 --port 4187 --strictPort', url: 'http://127.0.0.1:4187', env: { VITE_API_URL: 'http://127.0.0.1:4017', VITE_USE_MOCK_API: 'false', VITE_APP_ENV: 'test', VITE_PORTAL_CONTEXT: 'merchant' } },
    { command: 'pnpm exec vite --host 127.0.0.1 --port 4188 --strictPort', url: 'http://127.0.0.1:4188', env: { VITE_API_URL: 'http://127.0.0.1:4017', VITE_USE_MOCK_API: 'false', VITE_APP_ENV: 'test', VITE_PORTAL_CONTEXT: 'staff' } },
  ],
});
