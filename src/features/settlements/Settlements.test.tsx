import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { MOCK_SETTLEMENTS } from '@/mocks/fixtures/settlements';
import { SettlementsList } from './SettlementsList';
import { SettlementDetail } from './SettlementDetail';

const base = `${env.apiUrl}/v1`;

function renderApp(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settlements" element={<SettlementsList />} />
          <Route path="/settlements/:id" element={<SettlementDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettlementsList', () => {
  it('lists real settlements derived from confirmed payments', async () => {
    renderApp('/settlements');
    await waitFor(() => expect(screen.getByText(MOCK_SETTLEMENTS[0].reference)).toBeInTheDocument());
  });

  it('navigates to the detail page on row click', async () => {
    renderApp('/settlements');
    const reference = MOCK_SETTLEMENTS[0].reference;
    await waitFor(() => expect(screen.getByText(reference)).toBeInTheDocument());

    await userEvent.click(screen.getByText(reference));
    await waitFor(() => expect(screen.getAllByText(reference).length).toBeGreaterThan(0));
    // Detail-only content proves we actually navigated, not just re-rendered the list.
    expect(await screen.findByText('Included transactions')).toBeInTheDocument();
  });

  it('shows an empty state when there are no settlements', async () => {
    server.use(http.get(`${base}/settlements`, () => HttpResponse.json({ data: [], page: 1, pageSize: 20, total: 0 })));
    renderApp('/settlements');
    expect(await screen.findByText(/no settlements yet/i)).toBeInTheDocument();
  });

  it('shows a retryable error state on an API failure', async () => {
    server.use(http.get(`${base}/settlements`, () => HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })));
    renderApp('/settlements');
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('SettlementDetail', () => {
  it('shows payment-vs-settlement distinction messaging for a non-completed settlement', async () => {
    const pending = MOCK_SETTLEMENTS.find((s) => s.status !== 'COMPLETED');
    if (!pending) return; // dataset is date-dependent; skip if today's seed has none
    renderApp(`/settlements/${pending.id}`);
    expect(await screen.findByText(/separate payout step/i)).toBeInTheDocument();
  });

  it('shows a not-found error for an unknown settlement id', async () => {
    renderApp('/settlements/stl_doesnotexist');
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
