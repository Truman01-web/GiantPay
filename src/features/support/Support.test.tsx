import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { useSessionStore } from '@/services/auth/sessionStore';
import type { Permission } from '@/types/auth';
import { SupportListView } from './SupportListView';
import { SupportDetailView } from './SupportDetailView';

const base = `${env.apiUrl}/v1`;
function renderRoute(view: React.ReactNode, permissions: Permission[], path = '/support') {
  useSessionStore.setState({ status: 'authenticated', session: { environment: 'sandbox', environments: ['sandbox'], user: { id: 'usr_1', name: 'Owner', email: 'owner@example.test', role: 'OWNER', permissions, merchantId: 'mer_01', merchantName: 'Merchant', mfaEnabled: true } } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path="/support" element={view} /><Route path="/support/:id" element={view} /><Route path="/admin/support" element={view} /><Route path="/admin/support/:id" element={view} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('support case management', () => {
  it('renders contract-backed cases and permission-aware create controls', async () => {
    renderRoute(<SupportListView />, ['support:read', 'support:write']);
    expect(await screen.findByText('SUP-88214', {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create case/i })).toBeInTheDocument();
  });

  it('hides write controls from read-only merchants', async () => {
    renderRoute(<SupportListView />, ['support:read']);
    await screen.findByText('SUP-88214');
    expect(screen.queryByRole('button', { name: /create case/i })).not.toBeInTheDocument();
  });

  it('shows empty and retry states safely', async () => {
    server.use(http.get(`${base}/support/cases`, () => HttpResponse.json({ data: [], total: 0, nextCursor: null })));
    const first = renderRoute(<SupportListView />, ['support:read']);
    expect(await screen.findByText('No support cases')).toBeInTheDocument();
    first.unmount();
    server.use(http.get(`${base}/support/cases`, () => HttpResponse.json({ error: { code: 'UNAVAILABLE', message: 'Support is temporarily unavailable.' } }, { status: 503 })));
    renderRoute(<SupportListView />, ['support:read']);
    expect(await screen.findByText('Support is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('validates case creation and prevents duplicate submits while pending', async () => {
    let resolveRequest: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { resolveRequest = resolve; });
    server.use(http.post(`${base}/support/cases`, async () => { await started; return HttpResponse.json({ id: 'sup_new', reference: 'SUP-NEW' }, { status: 201 }); }));
    renderRoute(<SupportListView />, ['support:read', 'support:write']);
    await userEvent.click(await screen.findByRole('button', { name: /create case/i }));
    await userEvent.click(screen.getByRole('button', { name: /^create case$/i }));
    expect(await screen.findByText(/subject must contain/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/subject/i), 'Sandbox question');
    await userEvent.type(screen.getByLabelText(/description/i), 'Please review this sandbox workflow.');
    await userEvent.click(screen.getByRole('button', { name: /^create case$/i }));
    expect(screen.getByRole('button', { name: /^create case$/i })).toBeDisabled();
    resolveRequest?.();
  });

  it('renders detail activity and invalidates it after a reply', async () => {
    let detailReads = 0;
    server.use(http.get(`${base}/support/cases/:id`, () => { detailReads += 1; return HttpResponse.json({ id: 'sup_1', reference: 'SUP-1', merchantId: 'm1', category: 'OTHER', subject: 'Case detail', status: 'OPEN', priority: 'NORMAL', assignedOwner: null, linkedTransaction: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), escalatedAt: null, resolvedAt: null, closedAt: null, resolutionSummary: null, description: 'Initial description', timeline: [] }); }), http.post(`${base}/support/cases/:id/replies`, () => HttpResponse.json({ id: 'msg_new' }, { status: 201 })));
    renderRoute(<SupportDetailView />, ['support:read', 'support:write'], '/support/sup_1');
    expect(await screen.findByText('Initial description')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/message/i), 'A merchant-visible follow-up.');
    await userEvent.click(screen.getByRole('button', { name: /add reply/i }));
    await waitFor(() => expect(detailReads).toBeGreaterThan(1));
  });

  it('requires confirmation and a resolution note for platform resolution', async () => {
    const status = vi.fn();
    server.use(http.post(`${base}/platform/support/cases/:id/status`, async ({ request }) => { status(await request.json()); return HttpResponse.json({}); }));
    renderRoute(<SupportDetailView platform />, ['platform.support.read', 'platform.support.manage'], '/admin/support/sup_01j7sup001');
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }));
    expect(screen.getByText('Resolve this case?')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Resolution note'), 'Resolved after reviewing sandbox evidence.');
    await userEvent.click(screen.getByRole('button', { name: 'Resolution' }));
    await waitFor(() => expect(status).toHaveBeenCalledWith(expect.objectContaining({ status: 'RESOLVED', reason: expect.stringContaining('sandbox evidence') })));
  });
});
