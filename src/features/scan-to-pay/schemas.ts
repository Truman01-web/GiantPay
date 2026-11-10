import { z } from 'zod';

export const createScanToPaySchema = z
  .object({
    label: z.string().trim().min(1, 'Enter a label or title for this QR code').max(100),
    currency: z.string().regex(/^[A-Z]{3}$/),
    mode: z.enum(['FIXED', 'CUSTOMER_ENTERED']),
    amountMinor: z.number().int().positive().nullable().optional(),
    minAmountMinor: z.number().int().positive().nullable().optional(),
    maxAmountMinor: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().optional(),
    maxSuccessfulPayments: z.number().int().positive().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'FIXED' && (!data.amountMinor || data.amountMinor <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a fixed amount for this QR code',
        path: ['amountMinor'],
      });
    }

    if (data.mode === 'CUSTOMER_ENTERED') {
      if (
        data.minAmountMinor != null &&
        data.maxAmountMinor != null &&
        data.minAmountMinor > data.maxAmountMinor
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Minimum amount must not exceed maximum amount',
          path: ['minAmountMinor'],
        });
      }
    }

    if (data.expiresAt) {
      const exp = new Date(`${data.expiresAt}T23:59:59.999`).getTime();
      if (Number.isNaN(exp) || exp <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiry date must be in the future',
          path: ['expiresAt'],
        });
      }
    }
  });

export type CreateScanToPayFormValues = z.infer<typeof createScanToPaySchema>;
