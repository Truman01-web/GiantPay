import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useSessionStore } from '@/services/auth/sessionStore';
import { RequireAuth, RequireMerchant, RequirePermission, RequirePlatformAdmin } from './guards';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={['/dashboard']}>{ui}</MemoryRouter>);
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'loading', session: null });
  });

  it('shows a loading state while the session is resolving', () => {
    renderWithRouter(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>,
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children once authenticated', () => {
    useSessionStore.setState({
      status: 'authenticated',
      session: {
        environment: 'sandbox',
        environments: ['sandbox'],
        user: { id: 'u1', name: 'Test', email: 't@example.mw', role: 'OWNER', permissions: [], merchantId: 'm1', merchantName: 'M', mfaEnabled: false },
      },
    });
    renderWithRouter(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>,
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('offers a retry instead of getting stuck when the session check failed', async () => {
    useSessionStore.setState({ status: 'error', session: null, sessionError: 'boom' });
    renderWithRouter(
      <RequireAuth>
        <div>Protected content</div>
      </RequireAuth>,
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't check your session/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(useSessionStore.getState().status).toBe('loading');
  });
});

describe('RequirePermission', () => {
  it('renders a permission-denied page instead of children when the permission is missing', () => {
    useSessionStore.setState({
      status: 'authenticated',
      session: {
        environment: 'sandbox',
        environments: ['sandbox'],
        user: { id: 'u1', name: 'Viewer', email: 'v@example.mw', role: 'VIEWER', permissions: ['payments:read'], merchantId: 'm1', merchantName: 'M', mfaEnabled: false },
      },
    });
    renderWithRouter(
      <RequirePermission permission="payments.refunds:request">
        <div>Refund form</div>
      </RequirePermission>,
    );
    expect(screen.queryByText('Refund form')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it('renders children when the required permission is present', () => {
    useSessionStore.setState({
      status: 'authenticated',
      session: {
        environment: 'sandbox',
        environments: ['sandbox'],
        user: { id: 'u1', name: 'Owner', email: 'o@example.mw', role: 'OWNER', permissions: ['payments.refunds:request'], merchantId: 'm1', merchantName: 'M', mfaEnabled: false },
      },
    });
    renderWithRouter(
      <RequirePermission permission="payments.refunds:request">
        <div>Refund form</div>
      </RequirePermission>,
    );
    expect(screen.getByText('Refund form')).toBeInTheDocument();
  });
});

describe('authority domains', () => {
  it('keeps merchant sessions out of platform administration', () => {
    useSessionStore.setState({ status: 'authenticated', session: { environment: 'sandbox', environments: ['sandbox'], user: { id: 'u1', name: 'Merchant', email: 'm@example.mw', role: 'OWNER', permissions: ['platform.health.read'], merchantId: 'm1', merchantName: 'M', mfaEnabled: false } } });
    renderWithRouter(<RequirePlatformAdmin><div>Admin content</div></RequirePlatformAdmin>);
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });

  it('keeps platform sessions out of merchant pages', () => {
    useSessionStore.setState({ status: 'authenticated', session: { environment: 'sandbox', environments: ['sandbox'], user: { id: 'u2', name: 'Admin', email: 'a@giantpay.mw', role: 'PLATFORM_ADMIN', permissions: [], merchantId: null, merchantName: null, mfaEnabled: true } } });
    renderWithRouter(<RequireMerchant><div>Merchant content</div></RequireMerchant>);
    expect(screen.queryByText('Merchant content')).not.toBeInTheDocument();
    expect(screen.getByText(/don't have access/i)).toBeInTheDocument();
  });
});
