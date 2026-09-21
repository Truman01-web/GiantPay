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
  PricingPage,
  PrivacyPage,
  TermsPage,
  StatusPage,
  NotFoundPage,
  PublicFeaturePage,
  CompanyAboutPage,
  CompanyGiantPlusPage,
  CompanyCompliancePage,
  CompanyContactPage,
  CompanyCareersPage,
  PublicDeveloperOverviewPage,
  PublicApiDocumentationPage,
  PublicCollectionsApiPage,
  PublicDisbursementsApiPage,
  PublicWebhooksPage,
  PublicSdksPage,
  PublicSandboxPage,
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
  ReportsPage,
  TeamPage,
  RolesPage,
  SupportPage,
  SupportDetailPage,
  AdminSupportPage,
  AdminSupportDetailPage,
  DeveloperDashboardPage,
  DeveloperApiKeysPage,
  DeveloperWebhooksPage,
  DeveloperWebhookDetailPage,
  AdminHomePage,
  MerchantApplicationsListPage,
  MerchantApplicationDetailPage,
  PendingRefundApprovalsPage,
  AuditLogsPage,
  SystemHealthPage,
} from './lazyPages';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/status', element: <StatusPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/products/:slug', element: <PublicFeaturePage /> },
      { path: '/services/:slug', element: <PublicFeaturePage /> },
      { path: '/resources/:slug', element: <PublicFeaturePage /> },
      { path: '/company/about', element: <CompanyAboutPage /> },
      { path: '/company/giantplus', element: <CompanyGiantPlusPage /> },
      { path: '/company/compliance', element: <CompanyCompliancePage /> },
      { path: '/company/contact', element: <CompanyContactPage /> },
      { path: '/company/careers', element: <CompanyCareersPage /> },
      { path: '/company/:slug', element: <PublicFeaturePage /> },
      { path: '/developers/overview', element: <PublicDeveloperOverviewPage /> },
      { path: '/developers/api-documentation', element: <PublicApiDocumentationPage /> },
      { path: '/developers/webhooks-api', element: <PublicWebhooksPage /> },
      { path: '/developers/collections-api', element: <PublicCollectionsApiPage /> },
      { path: '/developers/disbursements-api', element: <PublicDisbursementsApiPage /> },
      { path: '/developers/sdks', element: <PublicSdksPage /> },
      { path: '/developers/sandbox', element: <PublicSandboxPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: '/register',
        element: (
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        ),
      },
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

      {
        path: '/transactions',
        element: (
          <RequirePermission permission="payments:read">
            <TransactionsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/transactions/:id',
        element: (
          <RequirePermission permission="payments:read">
            <TransactionDetailPage />
          </RequirePermission>
        ),
      },

      {
        path: '/payment-links',
        element: (
          <RequirePermission permission="payments.links:manage">
            <PaymentLinksPage />
          </RequirePermission>
        ),
      },
      {
        path: '/payment-links/create',
        element: (
          <RequirePermission permission="payments.links:manage">
            <CreatePaymentLinkPage />
          </RequirePermission>
        ),
      },
      {
        path: '/payment-links/:id',
        element: (
          <RequirePermission permission="payments.links:manage">
            <PaymentLinkDetailPage />
          </RequirePermission>
        ),
      },

      {
        path: '/refunds',
        element: (
          <RequirePermission permission="payments.refunds:request">
            <RefundsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/refunds/:id',
        element: (
          <RequirePermission permission="payments.refunds:request">
            <RefundDetailPage />
          </RequirePermission>
        ),
      },

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
            <ReportsPage />
          </RequirePermission>
        ),
      },

      {
        path: '/developers',
        element: (
          <RequirePermission anyOf={['developer.apiKeys:manage', 'developer.webhooks:manage']}>
            <DeveloperDashboardPage />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/api-keys',
        element: (
          <RequirePermission permission="developer.apiKeys:manage">
            <DeveloperApiKeysPage />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/webhooks',
        element: (
          <RequirePermission permission="developer.webhooks:manage">
            <DeveloperWebhooksPage />
          </RequirePermission>
        ),
      },
      {
        path: '/developers/webhooks/:id',
        element: (
          <RequirePermission permission="developer.webhooks:manage">
            <DeveloperWebhookDetailPage />
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
          <RequirePermission permission="team:read">
            <TeamPage />
          </RequirePermission>
        ),
      },
      {
        path: '/roles',
        element: (
          <RequirePermission permission="roles:read">
            <RolesPage />
          </RequirePermission>
        ),
      },

      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/security', element: <SecuritySettingsPage /> },

      {
        path: '/support',
        element: (
          <RequirePermission permission="support:read">
            <SupportPage />
          </RequirePermission>
        ),
      },
      {
        path: '/support/:id',
        element: (
          <RequirePermission permission="support:read">
            <SupportDetailPage />
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
      {
        path: '/admin/support',
        element: (
          <RequirePermission permission="platform.support.read">
            <AdminSupportPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/support/:id',
        element: (
          <RequirePermission permission="platform.support.read">
            <AdminSupportDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin',
        element: (
          <RequirePermission anyOf={['platform.health.read', 'platform.merchants.read']}>
            <AdminHomePage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/merchant-applications',
        element: (
          <RequirePermission permission="compliance:review">
            <MerchantApplicationsListPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/merchant-applications/:id',
        element: (
          <RequirePermission permission="compliance:review">
            <MerchantApplicationDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/merchants',
        element: (
          <RequirePermission permission="platform.merchants.read">
            <FeatureComingSoon title="Merchants" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/merchants/:id',
        element: (
          <RequirePermission permission="platform.merchants.read">
            <FeatureComingSoon title="Merchant" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/transactions',
        element: (
          <RequirePermission permission="platform.transactions.read">
            <FeatureComingSoon title="All transactions" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/transactions/:id',
        element: (
          <RequirePermission permission="platform.transactions.read">
            <FeatureComingSoon title="Transaction" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/refunds',
        element: (
          <RequirePermission permission="platform.refunds.read">
            <FeatureComingSoon title="All refunds" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/refunds/pending',
        element: (
          <RequirePermission permission="payments.refunds:approve">
            <PendingRefundApprovalsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/settlements',
        element: (
          <RequirePermission permission="platform.settlements.read">
            <FeatureComingSoon title="Settlements" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/reconciliation',
        element: (
          <RequirePermission permission="platform.reconciliation.read">
            <FeatureComingSoon title="Reconciliation" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/exceptions',
        element: (
          <RequirePermission permission="platform.reconciliation.read">
            <FeatureComingSoon title="Exceptions" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/exceptions/:id',
        element: (
          <RequirePermission permission="platform.reconciliation.read">
            <FeatureComingSoon title="Exception" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/providers',
        element: (
          <RequirePermission permission="platform.operations.read">
            <FeatureComingSoon title="Providers" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <RequirePermission permission="team:read">
            <FeatureComingSoon title="Users" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/roles',
        element: (
          <RequirePermission permission="roles:read">
            <FeatureComingSoon title="Roles" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/audit-logs',
        element: (
          <RequirePermission permission="platform.audit.read">
            <AuditLogsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/incidents',
        element: (
          <RequirePermission permission="platform.incidents.read">
            <FeatureComingSoon title="Incidents" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/security',
        element: (
          <RequirePermission permission="platform.controls.read">
            <FeatureComingSoon title="Security" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <RequirePermission permission="platform.metrics.read">
            <FeatureComingSoon title="Reports" />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/system-health',
        element: (
          <RequirePermission permission="platform.health.read">
            <SystemHealthPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <RequirePermission permission="platform.operations.read">
            <FeatureComingSoon title="Admin settings" />
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
