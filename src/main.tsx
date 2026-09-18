import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { env } from './app/config/env';
import './index.css';

async function prepare() {
  if (!env.useMockApi) return;
  const { worker } = await import('./mocks/browser');
  try {
    await worker.start({
      onUnhandledRequest(request, print) {
        if (new URL(request.url).origin === new URL(env.apiUrl).origin) print.error();
      },
    });
  } catch (error) {
    // public/mockServiceWorker.js is generated (git-ignored) — `pnpm dev`
    // regenerates it automatically via the `predev` script, but fail loud
    // and still render rather than leaving a blank page if it's missing
    // for any other reason (e.g. Vite run directly, bypassing pnpm scripts).
    console.error(
      '[GiantPay] Mock API worker failed to start — API calls will fail until this is fixed. ' +
        'Run `pnpm msw:init` to regenerate public/mockServiceWorker.js.',
      error,
    );
  }
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
