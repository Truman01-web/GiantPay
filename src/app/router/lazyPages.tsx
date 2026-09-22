import { lazy } from 'react';

export const LandingPage = lazy(() => import('@/pages/LandingPage'));
export const PricingPage = lazy(() => import('@/pages/PricingPage'));
export const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
export const TermsPage = lazy(() => import('@/pages/TermsPage'));
export const StatusPage = lazy(() => import('@/pages/StatusPage'));
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
export const PublicFeaturePage = lazy(() => import('@/pages/PublicFeaturePage'));

export const CompanyAboutPage = lazy(() => import('@/pages/company/AboutPage'));
export const CompanyGiantPlusPage = lazy(() => import('@/pages/company/GiantPlusPage'));
export const CompanyCompliancePage = lazy(() => import('@/pages/company/CompliancePage'));
export const CompanyContactPage = lazy(() => import('@/pages/company/ContactPage'));
export const CompanyCareersPage = lazy(() => import('@/pages/company/CareersPage'));

export const PublicDeveloperOverviewPage = lazy(() => import('@/pages/developers/OverviewPage'));
export const PublicApiDocumentationPage = lazy(() => import('@/pages/developers/ApiDocumentationPage'));
export const PublicCollectionsApiPage = lazy(() => import('@/pages/developers/CollectionsApiPage'));
export const PublicDisbursementsApiPage = lazy(() => import('@/pages/developers/DisbursementsApiPage'));
export const PublicWebhooksPage = lazy(() => import('@/pages/developers/WebhooksPage'));
export const PublicSdksPage = lazy(() => import('@/pages/developers/SdksPage'));
export const PublicSandboxPage = lazy(() => import('@/pages/developers/SandboxPage'));

export const LoginPage = lazy(() => import('@/pages/LoginPage'));
export const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
export const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
export const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
export const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));

export const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
export const PaymentStatusPage = lazy(() => import('@/pages/PaymentStatusPage'));

export const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
export const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
export const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'));
export const TransactionDetailPage = lazy(() => import('@/pages/TransactionDetailPage'));
export const PaymentLinksPage = lazy(() => import('@/pages/PaymentLinksPage'));
export const CreatePaymentLinkPage = lazy(() => import('@/pages/CreatePaymentLinkPage'));
export const PaymentLinkDetailPage = lazy(() => import('@/pages/PaymentLinkDetailPage'));
export const RefundsPage = lazy(() => import('@/pages/RefundsPage'));
export const RefundDetailPage = lazy(() => import('@/pages/RefundDetailPage'));
export const SettlementsPage = lazy(() => import('@/pages/SettlementsPage'));
export const SettlementDetailPage = lazy(() => import('@/pages/SettlementDetailPage'));
export const ReconciliationPage = lazy(() => import('@/pages/ReconciliationPage'));
export const ReconciliationRunDetailPage = lazy(() => import('@/pages/ReconciliationRunDetailPage'));
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const SecuritySettingsPage = lazy(() => import('@/pages/SecuritySettingsPage'));
export const ReportsPage = lazy(() => import('@/pages/ReportsPage'));

// Merchant-area pages (team, roles, support)
export const TeamPage = lazy(() => import('@/pages/TeamPage'));
export const RolesPage = lazy(() => import('@/pages/RolesPage'));
export const SupportPage = lazy(() => import('@/pages/SupportPage'));
export const SupportDetailPage = lazy(() => import('@/pages/SupportDetailPage'));
export const AdminSupportPage = lazy(() => import('@/pages/admin/AdminSupportPage'));
export const AdminSupportDetailPage = lazy(() => import('@/pages/admin/AdminSupportDetailPage'));

export const DeveloperDashboardPage = lazy(() => import('@/pages/DeveloperDashboardPage'));
export const DeveloperApiKeysPage = lazy(() => import('@/pages/DeveloperApiKeysPage'));
export const DeveloperWebhooksPage = lazy(() => import('@/pages/DeveloperWebhooksPage'));
export const DeveloperWebhookDetailPage = lazy(() => import('@/pages/DeveloperWebhookDetailPage'));
export const DeveloperDocumentationPage = lazy(() => import('@/pages/DeveloperDocumentationPage'));

export const AdminHomePage = lazy(() => import('@/pages/AdminHomePage'));
export const MerchantApplicationsListPage = lazy(() => import('@/pages/MerchantApplicationsListPage'));
export const MerchantApplicationDetailPage = lazy(() => import('@/pages/MerchantApplicationDetailPage'));
export const PendingRefundApprovalsPage = lazy(() => import('@/pages/PendingRefundApprovalsPage'));
export const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
export const SystemHealthPage = lazy(() => import('@/pages/SystemHealthPage'));

export const AdminMerchantsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminMerchantsPage })));
export const AdminMerchantDetailPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminMerchantDetailPage })));
export const AdminTransactionsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminTransactionsPage })));
export const AdminTransactionDetailPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminTransactionDetailPage })));
export const AdminRefundsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminRefundsPage })));
export const AdminPendingRefundsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminPendingRefundsPage })));
export const AdminSettlementsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminSettlementsPage })));
export const AdminReconciliationPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminReconciliationPage })));
export const AdminExceptionsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminExceptionsPage })));
export const AdminExceptionDetailPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminExceptionDetailPage })));
export const AdminProvidersPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminProvidersPage })));
export const AdminUsersPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminUsersPage })));
export const AdminRolesPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminRolesPage })));
export const AdminAuditLogsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminAuditLogsPage })));
export const AdminIncidentsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminIncidentsPage })));
export const AdminSecurityPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminSecurityPage })));
export const AdminReportsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminReportsPage })));
export const AdminSettingsPage = lazy(() => import('@/pages/admin/PlatformResourcePages').then((module) => ({ default: module.AdminSettingsPage })));
