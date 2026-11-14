import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { useSessionStore } from '@/services/auth/sessionStore';
import type { Permission } from '@/types/auth';
import { RolesView } from './RolesView';
import { TeamView } from './TeamView';

const base = `${env.apiUrl}/v1`;
function renderView(view: React.ReactNode, permissions: Permission[]) {
  useSessionStore.setState({ status: 'authenticated', session: { environment: 'sandbox', environments: ['sandbox'], user: { id: 'usr_01j7usr001', name: 'Owner', email: 'owner@example.test', role: 'OWNER', permissions, merchantId: 'm1', merchantName: 'Merchant', mfaEnabled: true } } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{view}</QueryClientProvider>);
}

describe('TeamView', () => {
  it('renders members and invitations from the API', async () => {
    renderView(<TeamView />, ['team:read', 'team:manage', 'roles:read']);
    expect(await screen.findByText('Grace Phiri')).toBeInTheDocument();
    expect(await screen.findByText('finance@kambazapay.mw')).toBeInTheDocument();
  });

  it('hides management controls without team:manage', async () => {
    renderView(<TeamView />, ['team:read', 'roles:read']);
    await screen.findByText('Grace Phiri');
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
  });

  it('shows validation before submitting an invitation', async () => {
    renderView(<TeamView />, ['team:read', 'team:manage', 'roles:read']);
    await userEvent.click(await screen.findByRole('button', { name: /invite member/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'valid@example.test');
    await userEvent.click(screen.getByRole('button', { name: /send invitation/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/select a role/i);
  });

  it('shows a retry state for API errors', async () => {
    server.use(http.get(`${base}/team/members`, () => HttpResponse.json({ error: { code: 'FAILED', message: 'Team unavailable' } }, { status: 503 })));
    renderView(<TeamView />, ['team:read', 'roles:read']);
    expect(await screen.findByText('Team unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('RolesView', () => {
  it('renders roles and opens the create workflow', async () => {
    renderView(<RolesView />, ['roles:read', 'roles:manage']);
    expect(await screen.findByText('Developer')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /create role/i }));
    expect(screen.getByText('Create custom role')).toBeInTheDocument();
    expect(screen.getByLabelText('payments:read')).toBeInTheDocument();
  });

  it('requires confirmation before archiving a custom role', async () => {
    server.use(http.get(`${base}/roles`, () => HttpResponse.json({ items: [{ id: 'role_custom', name: 'Auditor', description: 'Audit access', permissions: ['audit:read'], systemRole: false, status: 'ACTIVE', memberCount: 0 }], total: 1 })));
    renderView(<RolesView />, ['roles:read', 'roles:manage']);
    await userEvent.click(await screen.findByRole('button', { name: /archive/i }));
    expect(screen.getByText('Archive role?')).toBeInTheDocument();
  });
});
