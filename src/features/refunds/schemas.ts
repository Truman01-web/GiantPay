import { z } from 'zod';

export function refundRequestSchema(refundableAmountMinor: number) {
  return z.object({
    amountMinor: z
      .number({ error: 'Enter an amount' })
      .int()
      .positive('Enter an amount greater than zero')
      .max(refundableAmountMinor, 'Amount exceeds the refundable balance for this payment'),
    reason: z.string().min(5, 'Explain the reason for this refund'),
  });
}
export type RefundRequestFormValues = { amountMinor: number; reason: string };
