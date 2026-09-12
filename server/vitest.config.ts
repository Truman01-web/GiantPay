import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**'],
    environment: 'node',
    globals: false,
    setupFiles: ['test/setup.ts'],
  },
});
