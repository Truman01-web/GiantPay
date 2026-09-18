import { z } from 'zod';

export const createPaymentLinkSchema = z
  .object({
    name: z.string().min(2, 'Give this link a name'),
    mode: z.literal('FIXED'),
    amountMinor: z.number().int().positive().nullable(),
    currency: z.string().min(1),
    description: z.string().max(500).optional(),
    customerReference: z.string().max(120).optional(),
    reusable: z.boolean(),
    maxSuccessfulPayments: z.number().int().positive().nullable(),
    expiresAt: z.string().optional(),
    redirectUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  })
  .refine((data) => data.mode !== 'FIXED' || (data.amountMinor != null && data.amountMinor > 0), {
    message: 'Enter an amount for a fixed-price link',
    path: ['amountMinor'],
  })
  .refine((data) => data.reusable || (data.maxSuccessfulPayments == null || data.maxSuccessfulPayments === 1), {
    message: 'A single-use link accepts only one successful payment',
    path: ['maxSuccessfulPayments'],
  })
  .refine((data) => !data.expiresAt || new Date(`${data.expiresAt}T23:59:59.999`).getTime() > Date.now(), {
    message: 'Choose a future expiry date',
    path: ['expiresAt'],
  });

export type CreatePaymentLinkFormValues = z.infer<typeof createPaymentLinkSchema>;
