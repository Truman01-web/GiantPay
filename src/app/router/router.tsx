import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { MerchantLayout } from '@/layouts/MerchantLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CheckoutLayout } from '@/layouts/CheckoutLayout';
import { RequireAuth, RequirePermission, RedirectIfAuthenticated } from './guards';
import { FeatureComingSoon } from '@/components/feedback/FeatureComingSoon';
import {
  LandingPage,
  PrivacyPage,
  TermsPage,
  StatusPage,
  NotFoundPage,
  PublicFeaturePage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  CheckoutPage,
  PaymentStatusPage,
  DashboardPage,
  OnboardingPage,
  TransactionsPage,
  TransactionDetailPage,
  PaymentLinksPage,
  CreatePaymentLinkPage,
  PaymentLinkDetailPage,
  RefundsPage,
  RefundDetailPage,
  SettlementsPage,
  SettlementDetailPage,
  ReconciliationPage,
  ReconciliationRunDetailPage,
  SettingsPage,
  SecuritySettingsPage,
} from './lazyPages';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/status', element: <StatusPage /> },
      { path: '/pricing', element: <PublicFeaturePage /> },
      { path: '/products/:slug', element: <PublicFeaturePage /> },
      { path: '/services/:slug', element: <PublicFeaturePage /> },
      { path: '/resources/:slug', element: <PublicFeaturePage /> },
      { path: '/company/:slug', element: <PublicFeaturePage /> },
      { path: '/developers/collections-api', element: <PublicFeaturePage /> },
      { path: '/developers/disbursements-api', element: <PublicFeaturePage /> },
      { path: '/developers/sdks', element: <PublicFeaturePage /> },
      { path: '/developers/sandbox', element: <PublicFeaturePage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated> },
      { path: '/register', element: <RedirectIfAuthenticated><RegisterPage /></RedirectIfAuthenticated> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },
  {
    element: <CheckoutLayout />,
    children: [
      { path: '/checkout/:token', element: <CheckoutPage /> },
      { path: '/payment/:reference', element: <PaymentStatusPage /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <MerchantLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },

      { path: '/transactions', element: <RequirePermission permission="payments:read"><TransactionsPage /></RequirePermission> },
      { path: '/transactions/:id', element: <RequirePermission permission="payments:read"><TransactionDetailPage /></RequirePermission> },

      { path: '/payment-links', element: <RequirePermission permission="payments.links:manage"><PaymentLinksPage /></RequirePermission> },
      { path: '/payment-links/create', element: <RequirePermission permission="payments.links:manage"><CreatePaymentLinkPage /></RequirePermission> },
      { path: '/payment-links/:id', element: <RequirePermission permission="payments.links:manage"><PaymentLinkDetailPage /></RequirePermission> },

      { path: '/refunds', element: <RequirePermission permission="payments.refunds:request"><RefundsPage /></RequirePermission> },
      { path: '/refunds/:id', element: <RequirePermission permission="payments.refunds:request"><RefundDetailPage /></RequirePermission> },

      {
        path: '/settlements',
        element: (
          <RequirePermission permission="settlements:read">
            <SettlementsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/settlements/:id',
        element: (
          <RequirePermission permission="settlements:read">
            <SettlementDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/reconciliation',
        element: (
          <RequirePermission permission="reconciliation:read">
            <ReconciliationPage />
          </RequirePermission>
        ),
      },
      {
        path: '/reconciliation/:id',
        element: (
          <RequirePermission permission="reconciliation:read">
            <ReconciliationRunDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/reports',
        element: (
          <RequirePermission permission="reports:read">
            <FeatureComingSoon title="Reports" description="Backend-generated transaction, fee, refund and settlement reports are on the roadmap." />
          </RequirePermission>
        ),
      },

      {
        path: '/developers',
        element: (
          <RequirePermission permission="developer.apiKeys:manage">
            <FeatureComingSoon title="Developers" description="API key management, webhooks and documentation are on the roadmap." />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/api-keys',
        element: (
          <RequirePermission permission="developer.apiKeys:manage">
            <FeatureComingSoon title="API keys" />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/webhooks',
        element: (
          <RequirePermission permission="developer.webhooks:manage">
            <FeatureComingSoon title="Webhooks" />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/webhooks/:id',
        element: (
          <RequirePermission permission="developer.webhooks:manage">
            <FeatureComingSoon title="Webhook detail" />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/documentation',
        element: (
          <RequirePermission permission="developer.apiKeys:manage">
            <FeatureComingSoon title="Developer documentation" />
          </RequirePermission>
        ),
      },

      {
        path: '/team',
        element: (
          <RequirePermission permission="team:manage">
            <FeatureComingSoon title="Team" description="Invite teammates and manage access — on the roadmap." />
          </RequirePermission>
        ),
      },
      {
        path: '/roles',
        element: (
          <RequirePermission permission="roles:manage">
            <FeatureComingSoon title="Roles & permissions" />
          </RequirePermission>
        ),
      },

      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/security', element: <SecuritySettingsPage /> },

      {
        path: '/support',
        element: (
          <RequirePermission permission="support:read">
            <FeatureComingSoon title="Support" description="Support case tracking is on the roadmap." />
          </RequirePermission>
        ),
      },
      {
        path: '/support/:id',
        element: (
          <RequirePermission permission="support:read">
            <FeatureComingSoon title="Support case" />
          </RequirePermission>
        ),
      },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/admin', element: <RequirePermission anyOf={['admin.platform:manage', 'admin.merchants:review']}><FeatureComingSoon title="Admin home" description="Platform-wide health and activity summary — on the roadmap." /></RequirePermission> },
      { path: '/admin/merchant-applications', element: <RequirePermission permission="admin.merchants:review"><FeatureComingSoon title="Merchant applications" /></RequirePermission> },
      { path: '/admin/merchant-applications/:id', element: <RequirePermission permission="admin.merchants:review"><FeatureComingSoon title="Merchant application" /></RequirePermission> },
      { path: '/admin/merchants', element: <RequirePermission permission="admin.merchants:review"><FeatureComingSoon title="Merchants" /></RequirePermission> },
      { path: '/admin/merchants/:id', element: <RequirePermission permission="admin.merchants:review"><FeatureComingSoon title="Merchant" /></RequirePermission> },
      { path: '/admin/transactions', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="All transactions" /></RequirePermission> },
      { path: '/admin/transactions/:id', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Transaction" /></RequirePermission> },
      { path: '/admin/refunds', element: <RequirePermission permission="admin.refunds:approve"><FeatureComingSoon title="All refunds" /></RequirePermission> },
      { path: '/admin/refunds/pending', element: <RequirePermission permission="admin.refunds:approve"><FeatureComingSoon title="Refund approvals" description="Maker-checker refund approval queue — on the roadmap." /></RequirePermission> },
      { path: '/admin/settlements', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Settlements" /></RequirePermission> },
      { path: '/admin/reconciliation', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Reconciliation" /></RequirePermission> },
      { path: '/admin/exceptions', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Exceptions" /></RequirePermission> },
      { path: '/admin/exceptions/:id', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Exception" /></RequirePermission> },
      { path: '/admin/providers', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Providers" /></RequirePermission> },
      { path: '/admin/users', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Users" /></RequirePermission> },
      { path: '/admin/roles', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Roles" /></RequirePermission> },
      { path: '/admin/audit-logs', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Audit logs" /></RequirePermission> },
      { path: '/admin/incidents', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Incidents" /></RequirePermission> },
      { path: '/admin/security', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Security" /></RequirePermission> },
      { path: '/admin/reports', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Reports" /></RequirePermission> },
      { path: '/admin/system-health', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="System health" /></RequirePermission> },
      { path: '/admin/settings', element: <RequirePermission permission="admin.platform:manage"><FeatureComingSoon title="Admin settings" /></RequirePermission> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
