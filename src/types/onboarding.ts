export type MerchantApplicationStatus =
  | 'DRAFT' | 'SUBMITTED' | 'RESUBMITTED' | 'UNDER_REVIEW'
  | 'INFORMATION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type IntendedChannel = 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type AddressKind = 'REGISTERED' | 'OPERATING';
export type EvidenceCategory = 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'DIRECTOR_IDENTIFICATION' | 'BENEFICIAL_OWNER_IDENTIFICATION' | 'ADDRESS' | 'BANK_ACCOUNT' | 'ADDITIONAL_COMPLIANCE';
export type EvidenceOwnerType = 'MERCHANT' | 'DIRECTOR' | 'BENEFICIAL_OWNER' | 'REPRESENTATIVE';

export interface BusinessInfo {
  legalName: string; tradingName: string; registrationNumber: string; taxId: string;
  businessType: string; industry: string; incorporationCountry: string; operatingCountry: string;
  contactEmail: string; contactPhone: string; website: string;
  expectedMonthlyVolumeMin: number; expectedMonthlyVolumeMax: number;
  expectedMonthlyValueMin: number; expectedMonthlyValueMax: number;
  intendedChannels: IntendedChannel[]; settlementAccountReference: string;
  /** Legacy display fields retained while old step components are removed. */
  addressLine1: string; addressLine2: string; city: string; postalAddress: string; contactName: string;
}

export interface AddressInfo { id: string; kind: AddressKind; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; }
export interface PersonInfo { id: string; fullName: string; email: string; nationality: string; identificationNumber: string; }
export interface BeneficialOwnerInfo extends PersonInfo { ownershipBasisPoints: number; }
export interface RepresentativeInfo { id: string; fullName: string; email: string; telephone: string; authority: string; identificationNumber: string; }
export interface QuestionnaireAnswers { natureOfBusiness: string; sourceOfFunds: string; expectedPaymentActivity: string; countriesOfOperation: string[]; politicallyExposedPerson: boolean; sanctionsDeclaration: boolean; highRiskBusiness: boolean; thirdPartyPaymentProcessing: boolean; refundAndDisputeExpectations: string; }
export interface QuestionnaireInfo { version: '2026-01'; declarationAccepted: boolean; answers: QuestionnaireAnswers; }
export interface EvidenceMetadata { id: string; category: EvidenceCategory; ownerType: EvidenceOwnerType; ownerId?: string; storageReference: string; mediaType: 'application/pdf' | 'image/jpeg' | 'image/png'; sizeBytes: number; sha256: string; fileName: string; removedAt?: string | null; }
export interface InformationRequest { id: string; reason: string; evidenceReference: string; response: string | null; requestedAt: string; respondedAt: string | null; }

export interface OwnerInfo { id: string; fullName: string; role: string; ownershipPercentage: number | null; nationalIdNumber: string; isBeneficialOwner: boolean; }
export interface UploadedDocument { id: string; category: string; fileName: string; sizeBytes: number; status: 'UPLOADING' | 'UPLOADED' | 'FAILED'; uploadProgress: number; error?: string | null; }
export interface SettlementConfig { destinationType: 'BANK_ACCOUNT' | 'MOBILE_MONEY'; bankName: string; accountNumberMasked: string; mobileNumberMasked: string; }

export interface OnboardingDraft {
  id: string | null; status: MerchantApplicationStatus; draftRevision: number; currentStep: number;
  business: Partial<BusinessInfo>; addresses: AddressInfo[]; directors: PersonInfo[];
  beneficialOwners: BeneficialOwnerInfo[]; representatives: RepresentativeInfo[];
  questionnaire: QuestionnaireInfo | null; evidenceMetadata: EvidenceMetadata[];
  informationRequests: InformationRequest[];
  timeline: Array<{ status: MerchantApplicationStatus; occurredAt: string; note?: string }>;
  owners: OwnerInfo[]; documents: UploadedDocument[]; settlement: Partial<SettlementConfig>; declarationAccepted: boolean;
}
