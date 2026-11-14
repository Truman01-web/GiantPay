import type { Permission, Session } from '@/types/auth';

const ALL_MERCHANT_PERMISSIONS: Permission[] = [
  'payments:read',
  'payments.links:manage',
  'payments.refunds:request',
  'payments.refunds:approve',
  'settlements:read',
  'settlements:manage',
  'settlements:approve',
  'reconciliation:read',
  'reconciliation:manage',
  'reconciliation:approve',
  'ledger:read',
  'ledger:integrity',
  'reports:read',
  'reports:export',
  'audit:read',
  'developer.apiKeys:manage',
  'developer.webhooks:manage',
  'team:read',
  'team:manage',
  'roles:read',
  'roles:manage',
  'sessions:read',
  'sessions:manage',
  'security:manage:self',
  'onboarding:read',
  'onboarding:write',
  'onboarding:submit',
  'support:read',
  'support:write',
  'compliance:read',
  'compliance:review',
  'compliance:approve',
];

/** Demo accounts available in mock mode. Never shipped/valid against a real backend. */
export const DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  session: Session;
}> = [
  {
    email: 'chikondi.banda@kambazapay.mw',
    password: 'GiantPay!Demo1',
    session: {
      environment: 'sandbox',
      environments: ['sandbox', 'production'],
      user: {
        id: 'usr_owner_01',
        name: 'Chikondi Banda',
        email: 'chikondi.banda@kambazapay.mw',
        role: 'OWNER',
        permissions: ALL_MERCHANT_PERMISSIONS,
        merchantId: 'mch_kambaza',
        merchantName: 'Kambaza Traders Ltd',
        mfaEnabled: true,
      },
    },
  },
  {
    email: 'grace.phiri@kambazapay.mw',
    password: 'GiantPay!Demo1',
    session: {
      environment: 'sandbox',
      environments: ['sandbox', 'production'],
      user: {
        id: 'usr_viewer_01',
        name: 'Grace Phiri',
        email: 'grace.phiri@kambazapay.mw',
        role: 'VIEWER',
        permissions: ['payments:read', 'settlements:read', 'reports:read'],
        merchantId: 'mch_kambaza',
        merchantName: 'Kambaza Traders Ltd',
        mfaEnabled: false,
      },
    },
  },
  {
    email: 'admin@giantpay.mw',
    password: 'GiantPay!Demo1',
    session: {
      environment: 'production',
      environments: ['production'],
      user: {
        id: 'usr_platform_admin_01',
        name: 'Esther Kaunda',
        email: 'admin@giantpay.mw',
        role: 'PLATFORM_ADMIN',
        permissions: ['platform.merchants.read', 'platform.transactions.read', 'platform.refunds.read', 'platform.settlements.read', 'platform.reconciliation.read', 'platform.health.read'],
        merchantId: null,
        merchantName: null,
        mfaEnabled: true,
      },
    },
  },
];
