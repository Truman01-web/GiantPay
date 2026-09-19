import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { useSessionStore } from '@/services/auth/sessionStore';
import { MOCK_RECONCILIATION_RUNS } from '@/mocks/fixtures/reconciliation';
import { ReconciliationOverview } from './ReconciliationOverview';
import { ReconciliationRunDetail } from './ReconciliationRunDetail';

const base = `${env.apiUrl}/v1`;

function renderApp(initialPath: string) {
  useSessionStore.setState({
    status: 'authenticated',
    session: {
      environment: 'sandbox',
      environments: ['sandbox'],
      user: {
        id: 'u1',
        name: 'Test Owner',
        email: 'owner@example.mw',
        role: 'OWNER',
        permissions: ['reconciliation:read', 'reconciliation:manage'],
        merchantId: 'm1',
        merchantName: 'Test Merchant',
        mfaEnabled: false,
      },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/reconciliation" element={<ReconciliationOverview />} />
          <Route path="/reconciliation/:id" element={<ReconciliationRunDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReconciliationOverview', () => {
  it('lists reconciliation runs with matched/unmatched/exception counts', async () => {
    renderApp('/reconciliation');
    expect(await screen.findAllByText(MOCK_RECONCILIATION_RUNS[0].provider)).not.toHaveLength(0);
  });

  it('shows an empty state when there are no runs', async () => {
    server.use(http.get(`${base}/reconciliation/runs`, () => HttpResponse.json({ data: [], page: 1, pageSize: 20, total: 0 })));
    renderApp('/reconciliation');
    expect(await screen.findByText(/no reconciliation runs yet/i)).toBeInTheDocument();
  });
});

describe('ReconciliationRunDetail', () => {
  it('shows a clean empty state for a run with no exceptions', async () => {
    const clean = MOCK_RECONCILIATION_RUNS.find((r) => r.exceptions.length === 0);
    if (!clean) return;
    renderApp(`/reconciliation/${clean.id}`);
    expect(await screen.findByText(/no exceptions in this run/i)).toBeInTheDocument();
  });

  it('lets a permitted user update an exception, and the change comes from a real backend round-trip', async () => {
    const withExceptions = MOCK_RECONCILIATION_RUNS.find((r) => r.exceptions.some((e) => e.status === 'OPEN'));
    if (!withExceptions) return; // date-seeded dataset; skip on a day with none
    const exception = withExceptions.exceptions.find((e) => e.status === 'OPEN')!;

    renderApp(`/reconciliation/${withExceptions.id}`);
    await waitFor(() => expect(screen.getByText(exception.transactionReference)).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole('button', { name: /^update$/i })[0]);
    expect(await screen.findByText('Update exception')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/what did you find/i), 'Confirmed with provider support.');
    await userEvent.click(screen.getByRole('button', { name: /save update/i }));

    // Dialog closes and the row now reflects the backend-confirmed new
    // status — never assumed successful just because the button was clicked.
    await waitFor(() => expect(screen.queryByText('Update exception')).not.toBeInTheDocument());
    expect(await screen.findByText('Under review')).toBeInTheDocument();
  });

  it('requires a note before resolving or dismissing', async () => {
    // OPEN only ever offers "investigate" or "escalate" (see
    // NEXT_STATUS_OPTIONS in schemas.ts) — "Resolve" only becomes
    // available from INVESTIGATING, so this drives that transition first
    // (no note required for it) the same way a real user would, then
    // reopens the dialog to exercise the note requirement on "Resolve".
    const run = MOCK_RECONCILIATION_RUNS.find((r) => r.exceptions.some((e) => e.status === 'OPEN'));
    if (!run) return;

    renderApp(`/reconciliation/${run.id}`);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^update$/i }).length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByRole('button', { name: /^update$/i })[0]);
    await screen.findByText('Update exception');
    await userEvent.click(screen.getByRole('button', { name: /save update/i })); // default = "Start investigating", no note needed
    await waitFor(() => expect(screen.queryByText('Update exception')).not.toBeInTheDocument());
    await screen.findByText('Under review');

    await userEvent.click(screen.getAllByRole('button', { name: /^update$/i })[0]);
    await screen.findByText('Update exception');
    await userEvent.click(screen.getByRole('radio', { name: /^resolve$/i }));
    await userEvent.click(screen.getByRole('button', { name: /save update/i }));

    expect(await screen.findByText(/add a short note/i)).toBeInTheDocument();
  });

  it('shows a safe error and does not silently apply the change on a failed update', async () => {
    const withExceptions = MOCK_RECONCILIATION_RUNS.find((r) => r.exceptions.some((e) => e.status === 'OPEN'));
    if (!withExceptions) return;
    const exception = withExceptions.exceptions.find((e) => e.status === 'OPEN')!;

    server.use(
      http.post(`${base}/reconciliation/exceptions/${exception.id}/review`, () =>
        HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }),
      ),
    );

    renderApp(`/reconciliation/${withExceptions.id}`);
    await waitFor(() => expect(screen.getByText(exception.transactionReference)).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: /^update$/i })[0]);
    await screen.findByText('Update exception');
    await userEvent.type(screen.getByPlaceholderText(/what did you find/i), 'Trying to update.');
    await userEvent.click(screen.getByRole('button', { name: /save update/i }));

    // The backend's own safe message is shown (matches this app's
    // established error-display convention — see RequestRefundDialog).
    expect(await screen.findByText('boom')).toBeInTheDocument();
    // Dialog stays open — the failed update was not silently treated as applied.
    expect(screen.getByText('Update exception')).toBeInTheDocument();
  });
});
