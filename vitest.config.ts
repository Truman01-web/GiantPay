import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
      css: true,
      // Reuse worker processes across test files instead of spawning one
      // per file — spawning is slow on constrained/sandboxed hosts and was
      // causing worker-startup timeouts.
      isolate: false,
      testTimeout: 15000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: ['src/mocks/**', 'src/pages/**', 'e2e/**', '**/*.d.ts'],
      },
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'server/**'],
    },
  }),
);
