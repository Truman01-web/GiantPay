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
export const TeamPage = lazy(() => import('@/pages/TeamPage'));
export const RolesPage = lazy(() => import('@/pages/RolesPage'));

export const DeveloperDashboardPage = lazy(() => import('@/pages/DeveloperDashboardPage'));
export const DeveloperApiKeysPage = lazy(() => import('@/pages/DeveloperApiKeysPage'));
export const DeveloperWebhooksPage = lazy(() => import('@/pages/DeveloperWebhooksPage'));
export const DeveloperWebhookDetailPage = lazy(() => import('@/pages/DeveloperWebhookDetailPage'));
