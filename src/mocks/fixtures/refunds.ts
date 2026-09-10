import type { Refund } from '@/types/payments';
import { MOCK_PAYMENTS } from './payments';

const successfulPayments = MOCK_PAYMENTS.filter((p) => p.refundedAmountMinor > 0).slice(0, 6);

export const MOCK_REFUNDS: Refund[] = successfulPayments.map((payment, index) => ({
  id: `ref_${(index + 1).toString().padStart(4, '0')}`,
  reference: `RF-${300000 + index}`,
  paymentId: payment.id,
  paymentReference: payment.reference,
  amount: { amountMinor: payment.refundedAmountMinor, currency: 'MWK' },
  reason: index % 2 === 0 ? 'Customer requested cancellation' : 'Duplicate charge',
  status: (['SUCCEEDED', 'PENDING_APPROVAL', 'PROCESSING', 'REJECTED', 'REQUESTED', 'SUCCEEDED'] as const)[
    index % 6
  ],
  requestedBy: { id: 'usr_owner_01', name: 'Chikondi Banda' },
  approvedBy: index % 3 === 0 ? { id: 'usr_finance_01', name: 'Grace Phiri' } : null,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (index + 1)).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 60 * (index + 1)).toISOString(),
}));
