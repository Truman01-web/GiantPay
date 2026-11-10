import type { PaymentStatus } from '../payments/paymentState.js';

export interface InitiatePaymentInput {
  paymentReference: string;
  amountMinor: number;
  currency: string;
  channel: 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER';
  customer: { name?: string; email?: string; phone?: string };
}

export interface ProviderPaymentResult {
  providerPaymentId: string;
  status: Extract<PaymentStatus, 'PROCESSING' | 'PENDING'>;
  /**
   * For hosted-checkout providers (e.g. Flutterwave), the URL to redirect
   * the customer to the provider's hosted payment page.
   * GiantPay never collects raw card details; the customer completes payment
   * on the provider's page and is redirected back.
   * Absent for direct-API providers (e.g. sandbox).
   */
  checkoutUrl?: string;
}

export interface ProviderPaymentStatus {
  providerPaymentId: string;
  status: PaymentStatus;
}

export interface ProviderWebhookEvent {
  eventId: string;
  eventType: 'payment.status.changed';
  paymentReference: string;
  providerPaymentId: string;
  status: PaymentStatus;
  occurredAt: string;
}

export interface WebhookHeaders {
  signature?: string;
  timestamp?: string;
  /** Flutterwave v3 uses verif-hash for webhook authentication */
  verifHash?: string;
}

export interface PaymentProvider {
  readonly name: string;
  initiatePayment(input: InitiatePaymentInput): Promise<ProviderPaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
  parseAndVerifyWebhook(rawBody: Buffer, headers: WebhookHeaders, now?: Date): ProviderWebhookEvent;
  initiateRefund(): Promise<never>;
}
