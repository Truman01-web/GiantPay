import { StrictMode } from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { useSessionStatus } from '@/hooks/useSession';
import { useSessionStore } from '@/services/auth/sessionStore';
import { SessionProvider } from './SessionProvider';

const base = `${env.apiUrl}/v1`;

function StatusProbe() {
  const status = useSessionStatus();
  return <div data-testid="status">{status}</div>;
}

// Rendered under StrictMode deliberately: the bootstrap effect must mount,
// clean up, and mount again (React's dev-mode double-invoke) and still
// reach a terminal status — this is the exact sequence that used to leave
// the app stuck on "Checking your session".
function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusProbe />
        </SessionProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'loading', session: null, sessionError: null, retryToken: 0 });
  });

  it('resolves to unauthenticated when no session cookie is present', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('resolves to authenticated when a valid session exists', async () => {
    server.use(
      http.get(`${base}/auth/session`, () =>
        HttpResponse.json({
          session: {
            environment: 'sandbox',
            environments: ['sandbox'],
            user: {
              id: 'u1',
              name: 'Test',
              email: 't@example.mw',
              role: 'OWNER',
              permissions: [],
              merchantId: 'm1',
              merchantName: 'M',
              mfaEnabled: false,
            },
          },
        }),
      ),
    );

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
  });

  it('treats an expired/invalid session (401) as unauthenticated, not an error', async () => {
    server.use(
      http.get(`${base}/auth/session`, () =>
        HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not signed in.' } }, { status: 401 }),
      ),
    );

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('surfaces a retryable error state when the session check fails on the server, and recovers on retry', async () => {
    server.use(
      http.get(`${base}/auth/session`, () =>
        HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }),
      ),
    );

    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));

    server.use(http.get(`${base}/auth/session`, () => HttpResponse.json({ session: null })));
    useSessionStore.getState().retrySessionCheck();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('never leaves the status stuck on loading under React StrictMode', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).not.toHaveTextContent('loading'));
  });
});
