import type { OnboardingDraft } from '@/types/onboarding';

export const MOCK_ONBOARDING_DRAFT: OnboardingDraft = {
  status: 'DRAFT',
  currentStep: 1,
  business: {
    legalName: 'Kambaza Traders Limited',
    tradingName: 'Kambaza Traders',
    registrationNumber: '',
    taxId: '',
    businessType: 'Private Limited Company',
    industry: 'Retail & E-commerce',
    addressLine1: '',
    addressLine2: '',
    city: 'Blantyre',
    postalAddress: '',
    website: 'https://kambazatraders.mw',
    contactName: 'Chikondi Banda',
    contactEmail: 'chikondi.banda@kambazapay.mw',
    contactPhone: '+265 991 234 567',
  },
  owners: [],
  documents: [],
  settlement: {},
  declarationAccepted: false,
  timeline: [{ status: 'DRAFT', occurredAt: new Date().toISOString() }],
};
