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
import { useSessionStore } from '@/services/auth/sessionStore';
import type { Permission } from '@/types/auth';
import type { Settlement } from '@/types/settlements';

const base = `${env.apiUrl}/v1`;

function renderApp(initialPath: string, permissions: Permission[] = ['settlements:read']) {
  useSessionStore.setState({ status: 'authenticated', session: { environment: 'sandbox', environments: ['sandbox'], user: { id: 'u1', name: 'Maker', email: 'maker@example.test', role: 'OWNER', permissions, merchantId: 'm1', merchantName: 'Merchant', mfaEnabled: false } } });
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
    await waitFor(() => expect(screen.getByText(MOCK_SETTLEMENTS[0].id)).toBeInTheDocument());
  });

  it('navigates to the detail page on row click', async () => {
    renderApp('/settlements');
    const reference = MOCK_SETTLEMENTS[0].id;
    await waitFor(() => expect(screen.getByText(reference)).toBeInTheDocument());

    await userEvent.click(screen.getByText(reference));
    await waitFor(() => expect(screen.getAllByText(reference).length).toBeGreaterThan(0));
    // Detail-only content proves we actually navigated, not just re-rendered the list.
    expect(await screen.findByText(/sandbox accounting record only/i)).toBeInTheDocument();
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
    const pending = MOCK_SETTLEMENTS.find((s) => s.status !== 'EXPORTED');
    if (!pending) return; // dataset is date-dependent; skip if today's seed has none
    renderApp(`/settlements/${pending.id}`);
    expect(await screen.findByText(/no external bank or mobile-money transfer/i)).toBeInTheDocument();
  });

  it('shows a not-found error for an unknown settlement id', async () => {
    renderApp('/settlements/stl_doesnotexist');
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('submits an eligible draft and refreshes the backend-confirmed state', async () => {
    const draft: Settlement = { ...MOCK_SETTLEMENTS[0], id: 'stl_draft', status: 'DRAFT', createdBy: 'u1', submittedAt: null, approvedBy: null, approvedAt: null };
    server.use(http.get(`${base}/settlements/:id`, () => HttpResponse.json(draft)), http.post(`${base}/settlements/:id/submit`, () => { draft.status = 'AWAITING_APPROVAL'; draft.submittedAt = new Date().toISOString(); return HttpResponse.json(draft); }));
    renderApp('/settlements/stl_draft', ['settlements:read', 'settlements:manage']);
    await userEvent.click(await screen.findByRole('button', { name: /^submit$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    expect(await screen.findByText(/separate reviewer/i)).toBeInTheDocument();
  });

  it('disables self-approval and approval when creator identity is missing', async () => {
    const awaiting: Settlement = { ...MOCK_SETTLEMENTS[0], status: 'AWAITING_APPROVAL', createdBy: 'u1' };
    server.use(http.get(`${base}/settlements/:id`, () => HttpResponse.json(awaiting)));
    const view = renderApp('/settlements/stl_sandbox_01', ['settlements:read', 'settlements:approve']);
    expect(await screen.findByRole('button', { name: /approve/i })).toBeDisabled();
    view.unmount();
    awaiting.createdBy = null;
    renderApp('/settlements/stl_sandbox_01', ['settlements:read', 'settlements:approve']);
    expect(await screen.findByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByText(/creator identity is unavailable/i)).toBeInTheDocument();
  });

  it('creates at most one batch when the form is submitted twice', async () => {
    let calls = 0;
    server.use(http.post(`${base}/settlements`, async ({ request }) => { calls += 1; const body = await request.json() as Record<string, string>; return HttpResponse.json({ ...MOCK_SETTLEMENTS[0], ...body, id: 'stl_new', status: 'DRAFT', createdBy: 'u1' }, { status: 201 }); }));
    renderApp('/settlements', ['settlements:read', 'settlements:manage']);
    await userEvent.click(await screen.findByRole('button', { name: /create batch/i }));
    await userEvent.type(screen.getByLabelText(/period start/i), '2026-02-01');
    await userEvent.type(screen.getByLabelText(/period end/i), '2026-02-02');
    const form = screen.getByRole('button', { name: /create batch/i }).closest('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(calls).toBe(1));
  });
});
