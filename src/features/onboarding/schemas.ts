import { z } from 'zod';

export const businessInfoSchema = z.object({
  legalName: z.string().min(2, 'Enter the registered legal name'),
  tradingName: z.string().min(2, 'Enter a trading name'),
  registrationNumber: z.string().min(1, 'Enter the business registration number'),
  taxId: z.string().optional(),
  businessType: z.string().min(1, 'Select a business type'),
  industry: z.string().min(1, 'Select an industry'),
  addressLine1: z.string().min(1, 'Enter a street address'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'Enter a city'),
  postalAddress: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  contactName: z.string().min(2, 'Enter a contact name'),
  contactEmail: z.string().min(1, 'Enter a contact email').email('Enter a valid email address'),
  contactPhone: z
    .string()
    .min(1, 'Enter a contact phone number')
    .regex(/^\+265\s?\d{2,3}\s?\d{3}\s?\d{3,4}$/, 'Enter a valid Malawi phone number, e.g. +265 991 234 567'),
});
export type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>;

export const settlementSchema = z.object({
  destinationType: z.enum(['BANK_ACCOUNT', 'MOBILE_MONEY']),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
});
export type SettlementFormValues = z.infer<typeof settlementSchema>;
