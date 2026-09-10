import type { Money } from '@/lib/money';

export type PaymentStatus =
  | 'CREATED'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentChannel = 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER';

export interface PaymentEvent {
  id: string;
  type:
    | 'PAYMENT_CREATED'
    | 'ATTEMPT_STARTED'
    | 'PROVIDER_REQUEST_ACCEPTED'
    | 'PROVIDER_RESPONSE_RECEIVED'
    | 'WEBHOOK_RECEIVED'
    | 'STATUS_VERIFIED'
    | 'LEDGER_RECORDED'
    | 'RECONCILED'
    | 'SETTLEMENT_UPDATED';
  label: string;
  occurredAt: string;
  detail?: string;
}

export interface Payment {
  id: string;
  reference: string;
  merchantReference: string | null;
  description: string | null;
  status: PaymentStatus;
  channel: PaymentChannel;
  providerName: string | null;
  gross: Money;
  fee: Money;
  tax: Money;
  net: Money;
  refundableAmountMinor: number;
  refundedAmountMinor: number;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  reconciliationState: 'UNRECONCILED' | 'MATCHED' | 'EXCEPTION';
  settlementState: 'NOT_SETTLED' | 'PENDING' | 'SETTLED';
}

export interface PaymentListItem {
  id: string;
  reference: string;
  merchantReference: string | null;
  customerName: string | null;
  amount: Money;
  channel: PaymentChannel;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type PaymentLinkMode = 'FIXED' | 'CUSTOMER_ENTERED';

export interface PaymentLink {
  id: string;
  name: string;
  mode: PaymentLinkMode;
  amount: Money | null;
  description: string | null;
  customerReference: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
  reusable: boolean;
  maxSuccessfulPayments: number | null;
  successfulPaymentsCount: number;
  redirectUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  url: string;
}

export type RefundStatus =
  | 'REQUESTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface Refund {
  id: string;
  reference: string;
  paymentId: string;
  paymentReference: string;
  amount: Money;
  reason: string;
  status: RefundStatus;
  requestedBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type CheckoutStatus =
  | 'INITIALIZING'
  | 'READY'
  | 'SUBMITTING'
  | 'REQUIRES_ACTION'
  | 'PROCESSING'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface CheckoutSession {
  token: string;
  reference: string;
  merchantDisplayName: string;
  description: string | null;
  merchantReference: string | null;
  amount: Money;
  availableChannels: PaymentChannel[];
  requiredCustomerFields: Array<'name' | 'email' | 'phone'>;
  status: CheckoutStatus;
  expiresAt: string;
}
