import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: 'local-sandbox.spec.ts', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4189', channel: 'chrome', actionTimeout: 15_000, navigationTimeout: 30_000 },
  timeout: 180_000,
});
