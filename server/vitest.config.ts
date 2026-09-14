import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**'],
    environment: 'node',
    globals: false,
    testTimeout: 15000,
    setupFiles: ['test/setup.ts'],
  },
});
