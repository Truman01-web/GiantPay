import type { Permission, Session } from '@/types/auth';

const ALL_MERCHANT_PERMISSIONS: Permission[] = [
  'payments:read',
  'payments.links:manage',
  'payments.refunds:request',
  'payments.refunds:approve',
  'settlements:read',
  'reconciliation:read',
  'reconciliation:manage',
  'reports:read',
  'developer.apiKeys:manage',
  'developer.webhooks:manage',
  'team:manage',
  'roles:manage',
  'settings:manage',
  'support:read',
  'support:manage',
  'compliance:read',
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
        permissions: ['admin.merchants:review', 'admin.refunds:approve', 'admin.platform:manage'],
        merchantId: null,
        merchantName: null,
        mfaEnabled: true,
      },
    },
  },
];
