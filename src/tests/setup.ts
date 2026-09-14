import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/server';
import { resetAuthMockState } from '@/mocks/handlers/auth';
import { resetMerchantsMockState } from '@/mocks/handlers/merchants';
import { resetReconciliationMockState } from '@/mocks/handlers/reconciliation';
import { submittedReferences } from '@/mocks/fixtures/checkout';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  // `server.resetHandlers()` only reverts per-test `server.use(...)`
  // overrides — it does not touch the mutable in-memory "backend" state a
  // handler closes over (session, onboarding draft, submitted payment
  // references). That state otherwise persists across test *files* under
  // this project's `isolate: false` vitest config (worker reuse shares the
  // module registry), letting one file's mock backend activity leak into
  // an unrelated, later test.
  resetAuthMockState();
  resetMerchantsMockState();
  resetReconciliationMockState();
  submittedReferences.clear();
});
afterAll(() => server.close());

// jsdom doesn't implement matchMedia — needed by prefers-reduced-motion
// checks and any Radix primitives that query it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom doesn't implement ResizeObserver — needed by Radix primitives
// (Checkbox, Switch) that measure their own size.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
