import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'api-status.spec.ts',
  globalSetup: './scripts/status-test-server.ts',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4178', channel: 'chrome' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'], defaultBrowserType: 'chromium' } },
  ],
});
