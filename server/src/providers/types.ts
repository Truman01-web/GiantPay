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
}

export interface PaymentProvider {
  readonly name: string;
  initiatePayment(input: InitiatePaymentInput): Promise<ProviderPaymentResult>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
  parseAndVerifyWebhook(rawBody: Buffer, headers: WebhookHeaders, now?: Date): ProviderWebhookEvent;
  initiateRefund(): Promise<never>;
}
