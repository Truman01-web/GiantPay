import type { ScanToPayCode } from '@/types/scanToPay';

export const MOCK_SCAN_TO_PAY_CODES: ScanToPayCode[] = [
  {
    id: 'qr_demo_1',
    label: 'Till 1 — Main Counter',
    currency: 'MWK',
    mode: 'FIXED',
    amountMinor: 250000, // MWK 2,500.00
    minAmountMinor: null,
    maxAmountMinor: null,
    status: 'ACTIVE',
    expiresAt: null,
    maxSuccessfulPayments: null,
    successfulPaymentsCount: 14,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    checkoutUrl: 'http://localhost:5173/checkout/qr/demo_qr_ready',
  },
  {
    id: 'qr_demo_2',
    label: 'Customer Discretionary Till',
    currency: 'MWK',
    mode: 'CUSTOMER_ENTERED',
    amountMinor: null,
    minAmountMinor: 50000, // MWK 500.00
    maxAmountMinor: 10000000, // MWK 100,000.00
    status: 'ACTIVE',
    expiresAt: null,
    maxSuccessfulPayments: null,
    successfulPaymentsCount: 8,
    createdAt: '2026-09-10T10:30:00.000Z',
    updatedAt: '2026-09-10T10:30:00.000Z',
    checkoutUrl: 'http://localhost:5173/checkout/qr/demo_qr_custom',
  },
  {
    id: 'qr_demo_3',
    label: 'Single-Use Invoice Promo',
    currency: 'MWK',
    mode: 'FIXED',
    amountMinor: 1500000, // MWK 15,000.00
    minAmountMinor: null,
    maxAmountMinor: null,
    status: 'EXPIRED',
    expiresAt: '2026-09-20T23:59:59.000Z',
    maxSuccessfulPayments: 1,
    successfulPaymentsCount: 1,
    createdAt: '2026-09-15T12:00:00.000Z',
    updatedAt: '2026-09-20T23:59:59.000Z',
    checkoutUrl: 'http://localhost:5173/checkout/qr/demo_qr_expired',
  },
];
