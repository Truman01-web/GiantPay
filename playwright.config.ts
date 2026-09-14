import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    // Builds the app in "e2e" mode (.env.e2e — mocked backend, never the
    // real production env) and serves the built bundle, so tests exercise
    // production-shaped code (minified, code-split) rather than the dev server.
    // `msw:init` regenerates the git-ignored public/mockServiceWorker.js —
    // required since a fresh checkout/CI run may never have run `pnpm dev`
    // (which regenerates it via the `predev` script) before this.
    command: 'pnpm msw:init && pnpm build --mode e2e && pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
