import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { MerchantLayout } from '@/layouts/MerchantLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CheckoutLayout } from '@/layouts/CheckoutLayout';
import { RequireAuth, RequireMerchant, RequirePermission, RequirePlatformAdmin, RedirectIfAuthenticated } from './guards';
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
  DeveloperDocumentationPage,
  AdminHomePage,
  MerchantApplicationsListPage,
  MerchantApplicationDetailPage,
  AdminMerchantsPage,
  AdminMerchantDetailPage,
  AdminTransactionsPage,
  AdminTransactionDetailPage,
  AdminRefundsPage,
  PendingRefundApprovalsPage,
  AdminSettlementsPage,
  AdminReconciliationPage,
  AdminExceptionsPage,
  AdminExceptionDetailPage,
  AdminProvidersPage,
  AdminUsersPage,
  AdminRolesPage,
  AuditLogsPage,
  AdminIncidentsPage,
  AdminSecurityPage,
  AdminReportsPage,
  SystemHealthPage,
  AdminSettingsPage,
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
        <RequireMerchant><MerchantLayout /></RequireMerchant>
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      {
        path: '/onboarding',
        element: (
          <RequirePermission anyOf={['onboarding:read', 'onboarding:write']}>
            <OnboardingPage />
          </RequirePermission>
        ),
      },

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
            <DeveloperDocumentationPage />
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

      {
        path: '/settings',
        element: (
          <RequirePermission permission="security:manage:self"><SettingsPage /></RequirePermission>
        ),
      },
      {
        path: '/settings/security',
        element: (
          <RequirePermission permission="security:manage:self"><SecuritySettingsPage /></RequirePermission>
        ),
      },

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
        <RequirePlatformAdmin><AdminLayout /></RequirePlatformAdmin>
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
            <AdminMerchantsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/merchants/:id',
        element: (
          <RequirePermission permission="platform.merchants.read">
            <AdminMerchantDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/transactions',
        element: (
          <RequirePermission permission="platform.transactions.read">
            <AdminTransactionsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/transactions/:id',
        element: (
          <RequirePermission permission="platform.transactions.read">
            <AdminTransactionDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/refunds',
        element: (
          <RequirePermission permission="platform.refunds.read">
            <AdminRefundsPage />
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
            <AdminSettlementsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/reconciliation',
        element: (
          <RequirePermission permission="platform.reconciliation.read">
            <AdminReconciliationPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/exceptions',
        element: (
          <RequirePermission permission="platform.reconciliation.read">
            <AdminExceptionsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/exceptions/:id',
        element: (
          <RequirePermission permission="platform.reconciliation.read">
            <AdminExceptionDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/providers',
        element: (
          <RequirePermission permission="platform.operations.read">
            <AdminProvidersPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <RequirePermission permission="team:read">
            <AdminUsersPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/roles',
        element: (
          <RequirePermission permission="roles:read">
            <AdminRolesPage />
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
            <AdminIncidentsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/security',
        element: (
          <RequirePermission permission="platform.controls.read">
            <AdminSecurityPage />
          </RequirePermission>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <RequirePermission permission="platform.metrics.read">
            <AdminReportsPage />
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
            <AdminSettingsPage />
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
