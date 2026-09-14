import type { Money } from '@/lib/money';

/**
 * A settlement batches confirmed payments into a payout to the merchant's
 * settlement destination. This is always a distinct, later concept from
 * payment success — see Payment.settlementState in types/payments.ts,
 * which a payment carries independently of its own PaymentStatus.
 */
export type SettlementStatus = 'PENDING' | 'AVAILABLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type SettlementDestinationType = 'BANK_ACCOUNT' | 'MOBILE_MONEY';

export interface SettlementListItem {
  id: string;
  reference: string;
  amount: Money;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  /** Already masked by the backend — the frontend never has the full
   * account/mobile number for a settlement destination. */
  destinationMasked: string;
  createdAt: string;
  completedAt: string | null;
  transactionCount: number;
}

export interface SettlementTransaction {
  id: string;
  reference: string;
  amount: Money;
  createdAt: string;
}

export interface Settlement extends SettlementListItem {
  destinationType: SettlementDestinationType;
  transactions: SettlementTransaction[];
}
