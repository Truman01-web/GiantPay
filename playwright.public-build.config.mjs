import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './build-acceptance',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/build-acceptance',
  use: {
    baseURL: process.env.BUILD_PREVIEW_URL || 'http://127.0.0.1:4190',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    javaScriptEnabled: false,
  },
});
