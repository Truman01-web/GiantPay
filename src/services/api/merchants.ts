import type { OnboardingDraft } from '@/types/onboarding';
import { apiClient, type RequestOptions } from './client';
import { ApiError } from './errors';
import { env } from '@/app/config/env';

export type OnboardingStatus = 'DRAFT' | 'SUBMITTED' | 'RESUBMITTED' | 'UNDER_REVIEW' | 'INFORMATION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export interface BusinessProfileInput { legalName: string; tradingName?: string; registrationNumber?: string; taxIdentifier?: string; businessType: string; industry: string; incorporationCountry: string; operatingCountry: string; contactEmail: string; contactPhone: string; website?: string; expectedMonthlyVolumeMin: number; expectedMonthlyVolumeMax: number; expectedMonthlyValueMin: number; expectedMonthlyValueMax: number; intendedChannels: Array<'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>; settlementAccountReference?: string; }
export interface AddressInput { kind: 'REGISTERED' | 'OPERATING'; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string; }
export interface PersonInput { fullName: string; email?: string; nationality: string; identificationNumber?: string; }
export interface OwnerInput extends PersonInput { ownershipBasisPoints: number; }
export interface RepresentativeInput { fullName: string; email: string; telephone: string; authority: string; identificationNumber?: string; }
export interface QuestionnaireInput { version: '2026-01'; declarationAccepted: boolean; answers: { natureOfBusiness: string; sourceOfFunds: string; expectedPaymentActivity: string; countriesOfOperation: string[]; politicallyExposedPerson: boolean; sanctionsDeclaration: boolean; highRiskBusiness: boolean; thirdPartyPaymentProcessing: boolean; refundAndDisputeExpectations: string; }; }
export interface EvidenceInput { category: 'BUSINESS_REGISTRATION' | 'TAX_REGISTRATION' | 'DIRECTOR_IDENTIFICATION' | 'BENEFICIAL_OWNER_IDENTIFICATION' | 'ADDRESS' | 'BANK_ACCOUNT' | 'ADDITIONAL_COMPLIANCE'; ownerType: 'MERCHANT' | 'DIRECTOR' | 'BENEFICIAL_OWNER' | 'REPRESENTATIVE'; ownerId?: string; storageReference: string; mediaType: 'application/pdf' | 'image/jpeg' | 'image/png'; sizeBytes: number; sha256: string; fileName: string; }
export interface BackendOnboarding { id: string; status: OnboardingStatus; draft_revision: number; created_at: string; updated_at: string; snapshot: { businessProfile: Record<string, unknown> | null; addresses: Record<string, unknown>[]; directors: Record<string, unknown>[]; beneficialOwners: Record<string, unknown>[]; authorizedRepresentatives: Record<string, unknown>[]; questionnaire: Record<string, unknown> | null; evidence: Record<string, unknown>[]; }; }

export function normalizeMalawiPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return `+265${(digits.startsWith('265') ? digits.slice(3) : digits.replace(/^0/, '')).slice(0, 9)}`;
}

function emptyDraft(): OnboardingDraft { return { status: 'DRAFT', currentStep: 1, business: {}, owners: [], documents: [], settlement: {}, declarationAccepted: false, timeline: [] }; }
function legacyView(value: BackendOnboarding): OnboardingDraft {
  const p = value.snapshot.businessProfile ?? {};
  return { ...emptyDraft(), status: value.status === 'RESUBMITTED' ? 'SUBMITTED' : value.status, business: { legalName: String(p.legal_name ?? ''), tradingName: String(p.trading_name ?? ''), registrationNumber: String(p.registration_number_masked ?? ''), taxId: String(p.tax_identifier_masked ?? ''), businessType: String(p.business_type ?? ''), industry: String(p.industry ?? ''), contactEmail: String(p.contact_email ?? ''), contactPhone: String(p.contact_phone ?? '') }, declarationAccepted: Boolean(value.snapshot.questionnaire && value.snapshot.questionnaire.declaration_accepted), currentStep: value.snapshot.businessProfile ? 2 : 1 };
}

export const merchantsApi = {
  async getBackendOnboarding(options?: RequestOptions): Promise<BackendOnboarding | null> {
    try { return await apiClient.get<BackendOnboarding>('/merchants/onboarding', options); }
    catch (error) { if (error instanceof ApiError && error.status === 404 && error.code === 'ONBOARDING_NOT_FOUND') return null; throw error; }
  },
  async getOnboarding(options?: RequestOptions): Promise<OnboardingDraft> { const value = await this.getBackendOnboarding(options); return value ? legacyView(value) : emptyDraft(); },
  saveBusinessProfile: (profile: BusinessProfileInput) => apiClient.patch('/merchants/onboarding', { ...profile, contactPhone: normalizeMalawiPhone(profile.contactPhone) }),
  addAddress: (value: AddressInput) => apiClient.post<{ id: string }>('/merchants/onboarding/addresses', value),
  removeAddress: (id: string) => apiClient.delete<void>(`/merchants/onboarding/addresses/${id}`),
  addDirector: (value: PersonInput) => apiClient.post<{ id: string }>('/merchants/onboarding/directors', value),
  removeDirector: (id: string) => apiClient.delete<void>(`/merchants/onboarding/directors/${id}`),
  addBeneficialOwner: (value: OwnerInput) => apiClient.post<{ id: string }>('/merchants/onboarding/beneficial-owners', value),
  removeBeneficialOwner: (id: string) => apiClient.delete<void>(`/merchants/onboarding/beneficial-owners/${id}`),
  addAuthorizedRepresentative: (value: RepresentativeInput) => apiClient.post<{ id: string }>('/merchants/onboarding/authorized-representatives', { ...value, telephone: normalizeMalawiPhone(value.telephone) }),
  removeAuthorizedRepresentative: (id: string) => apiClient.delete<void>(`/merchants/onboarding/authorized-representatives/${id}`),
  saveQuestionnaire: (value: QuestionnaireInput) => apiClient.put('/merchants/onboarding/questionnaire', value),
  registerEvidence: (value: EvidenceInput) => apiClient.post('/merchants/onboarding/evidence', value),
  async uploadDocument(payload: { category: string; file: File }, options?: { signal?: AbortSignal; onProgress?: (percent: number) => void }): Promise<{ id: string; fileName: string; sizeBytes: number }> {
    if (!env.useMockApi) throw new ApiError({ status: 503, code: 'BINARY_STORAGE_UNAVAILABLE', message: 'File upload is not enabled. Register evidence metadata only after storing the file in an approved secure service.' });
    const form = new FormData(); form.append('category', payload.category); form.append('file', payload.file);
    const result = await apiClient.uploadFile<unknown>('/merchants/onboarding/documents', form, options);
    const candidate = result as Record<string, unknown> | null;
    if (!candidate || typeof candidate.id !== 'string' || typeof candidate.fileName !== 'string' || typeof candidate.sizeBytes !== 'number') throw new ApiError({ status: 0, code: 'INVALID_RESPONSE', message: 'The upload could not be confirmed. Please try again.' });
    return { id: candidate.id, fileName: candidate.fileName, sizeBytes: candidate.sizeBytes };
  },
  removeEvidence: (id: string) => apiClient.delete<void>(`/merchants/onboarding/evidence/${id}`),
  submitOnboarding: () => apiClient.post<{ id: string; status: 'SUBMITTED'; message: string }>('/merchants/onboarding/submit', {}, { idempotencyKey: crypto.randomUUID() }),
  respondToInformationRequest: (requestId: string, response: string) => apiClient.post('/merchants/onboarding/information-response', { requestId, response }),
  resubmit: () => apiClient.post('/merchants/onboarding/resubmit', {}),
  history: () => apiClient.get<{ data: Record<string, unknown>[] }>('/merchants/onboarding/history'),
  async saveOnboardingDraft(payload: Partial<OnboardingDraft>): Promise<OnboardingDraft> {
    if (!payload.business) throw new ApiError({ status: 422, code: 'ONBOARDING_INCOMPLETE', message: 'Use the granular onboarding steps to save this section.' });
    const b = payload.business;
    await this.saveBusinessProfile({ legalName: b.legalName ?? '', tradingName: b.tradingName || undefined, registrationNumber: b.registrationNumber || undefined, taxIdentifier: b.taxId || undefined, businessType: b.businessType ?? '', industry: b.industry ?? '', incorporationCountry: 'MW', operatingCountry: 'MW', contactEmail: b.contactEmail ?? '', contactPhone: b.contactPhone ?? '', website: b.website || undefined, expectedMonthlyVolumeMin: 0, expectedMonthlyVolumeMax: 0, expectedMonthlyValueMin: 0, expectedMonthlyValueMax: 0, intendedChannels: ['MOBILE_MONEY'] });
    return this.getOnboarding();
  },
};
