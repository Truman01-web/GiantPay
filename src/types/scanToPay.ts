export type QrMode = 'FIXED' | 'CUSTOMER_ENTERED';

export type QrStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED';

export interface ScanToPayCode {
  id: string;
  label: string;
  currency: string;
  mode: QrMode;
  amountMinor: number | null;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  status: QrStatus;
  expiresAt: string | null;
  maxSuccessfulPayments: number | null;
  successfulPaymentsCount: number;
  createdAt: string;
  updatedAt: string;
  checkoutUrl: string;
}

export interface CreateScanToPayInput {
  label: string;
  currency?: string;
  mode: QrMode;
  amountMinor?: number;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  expiresAt?: string;
  maxSuccessfulPayments?: number;
}

export interface QrCheckoutInfo {
  token: string;
  merchantDisplayName: string;
  currency: string;
  mode: QrMode;
  amountMinor: number | null;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  availableChannels: ('MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER')[];
  status: 'READY' | 'EXPIRED';
  expiresAt: string | null;
  label: string;
}

export interface QrCheckoutSubmitInput {
  channel: 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER';
  requestedAmountMinor?: number;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface QrCheckoutSubmitResult {
  reference: string;
  status: string;
  checkoutUrl: string | null;
}

export interface QrPaymentItem {
  id: string;
  reference: string;
  status: string;
  amountMinor: number;
  currency: string;
  customerName: string | null;
  createdAt: string;
}
