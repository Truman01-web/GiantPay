import { lazy } from 'react';

export const LandingPage = lazy(() => import('@/pages/LandingPage'));
export const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
export const TermsPage = lazy(() => import('@/pages/TermsPage'));
export const StatusPage = lazy(() => import('@/pages/StatusPage'));
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

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
export const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
export const SecuritySettingsPage = lazy(() => import('@/pages/SecuritySettingsPage'));
