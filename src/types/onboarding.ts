export type MerchantApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INFORMATION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface BusinessInfo {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  taxId: string;
  businessType: string;
  industry: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalAddress: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface OwnerInfo {
  id: string;
  fullName: string;
  role: string;
  ownershipPercentage: number | null;
  nationalIdNumber: string;
  isBeneficialOwner: boolean;
}

export interface UploadedDocument {
  id: string;
  category: string;
  fileName: string;
  sizeBytes: number;
  status: 'UPLOADING' | 'UPLOADED' | 'FAILED';
  uploadProgress: number;
}

export interface SettlementConfig {
  destinationType: 'BANK_ACCOUNT' | 'MOBILE_MONEY';
  bankName: string;
  accountNumberMasked: string;
  mobileNumberMasked: string;
}

export interface OnboardingDraft {
  status: MerchantApplicationStatus;
  currentStep: number;
  business: Partial<BusinessInfo>;
  owners: OwnerInfo[];
  documents: UploadedDocument[];
  settlement: Partial<SettlementConfig>;
  declarationAccepted: boolean;
  timeline: Array<{ status: MerchantApplicationStatus; occurredAt: string; note?: string }>;
}
