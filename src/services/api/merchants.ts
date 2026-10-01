import { env } from '@/app/config/env';
import type { AddressInfo, BeneficialOwnerInfo, BusinessInfo, EvidenceMetadata, InformationRequest, OnboardingDraft, PersonInfo, QuestionnaireInfo, RepresentativeInfo } from '@/types/onboarding';
import { apiClient, type RequestOptions } from './client';
import { ApiError } from './errors';

export type OnboardingStatus = OnboardingDraft['status'];
export type BusinessProfileInput = Pick<BusinessInfo, 'legalName' | 'businessType' | 'industry' | 'incorporationCountry' | 'operatingCountry' | 'contactEmail' | 'contactPhone' | 'expectedMonthlyVolumeMin' | 'expectedMonthlyVolumeMax' | 'expectedMonthlyValueMin' | 'expectedMonthlyValueMax' | 'intendedChannels'> & Partial<Pick<BusinessInfo, 'tradingName' | 'registrationNumber' | 'taxId' | 'website' | 'settlementAccountReference'>>;
export type AddressInput = Omit<AddressInfo, 'id'>;
export type PersonInput = Omit<PersonInfo, 'id'>;
export type OwnerInput = Omit<BeneficialOwnerInfo, 'id'>;
export type RepresentativeInput = Omit<RepresentativeInfo, 'id'>;
export type QuestionnaireInput = QuestionnaireInfo;
export type EvidenceInput = Omit<EvidenceMetadata, 'id' | 'removedAt'>;

type Row = Record<string, unknown>;
export interface BackendOnboarding { id: string; status: OnboardingStatus; draft_revision: number; created_at: string; updated_at: string; snapshot: { businessProfile: Row | null; addresses: Row[]; directors: Row[]; beneficialOwners: Row[]; authorizedRepresentatives: Row[]; questionnaire: Row | null; evidence: Row[]; informationRequests?: Row[]; }; }

const string = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const id = (row: Row) => string(row.id);

function emptyDraft(): OnboardingDraft { return { id: null, status: 'DRAFT', draftRevision: 0, currentStep: 1, business: {}, addresses: [], directors: [], beneficialOwners: [], representatives: [], questionnaire: null, evidenceMetadata: [], informationRequests: [], timeline: [], owners: [], documents: [], settlement: {}, declarationAccepted: false }; }

export function adaptBackendOnboarding(value: BackendOnboarding): OnboardingDraft {
  const s = value.snapshot, p = s.businessProfile;
  const business: Partial<BusinessInfo> = p ? {
    legalName: string(p.legal_name), tradingName: string(p.trading_name), registrationNumber: string(p.registration_number_masked), taxId: string(p.tax_identifier_masked), businessType: string(p.business_type), industry: string(p.industry), incorporationCountry: string(p.incorporation_country), operatingCountry: string(p.operating_country), contactEmail: string(p.contact_email), contactPhone: string(p.contact_phone), website: string(p.website), expectedMonthlyVolumeMin: number(p.expected_monthly_volume_min), expectedMonthlyVolumeMax: number(p.expected_monthly_volume_max), expectedMonthlyValueMin: number(p.expected_monthly_value_min), expectedMonthlyValueMax: number(p.expected_monthly_value_max), intendedChannels: strings(p.intended_channels) as BusinessInfo['intendedChannels'], settlementAccountReference: string(p.settlement_account_masked), addressLine1: '', addressLine2: '', city: '', postalAddress: '', contactName: '',
  } : {};
  const addresses = s.addresses.map((r): AddressInfo => ({ id: id(r), kind: string(r.kind) as AddressInfo['kind'], line1: string(r.line1), line2: string(r.line2), city: string(r.city), region: string(r.region), postalCode: string(r.postal_code), country: string(r.country) }));
  const person = (r: Row): PersonInfo => ({ id: id(r), fullName: string(r.full_name), email: string(r.email), nationality: string(r.nationality), identificationNumber: string(r.identification_masked) });
  const directors = s.directors.map(person);
  const beneficialOwners = s.beneficialOwners.map((r): BeneficialOwnerInfo => ({ ...person(r), ownershipBasisPoints: number(r.ownership_basis_points) }));
  const representatives = s.authorizedRepresentatives.map((r): RepresentativeInfo => ({ id: id(r), fullName: string(r.full_name), email: string(r.email), telephone: string(r.telephone), authority: string(r.authority), identificationNumber: string(r.identification_masked) }));
  const q = s.questionnaire;
  const questionnaire: QuestionnaireInfo | null = q ? { version: string(q.version) as '2026-01', declarationAccepted: Boolean(q.declaration_accepted), answers: { natureOfBusiness: string((q.answers as Row)?.natureOfBusiness), sourceOfFunds: string((q.answers as Row)?.sourceOfFunds), expectedPaymentActivity: string((q.answers as Row)?.expectedPaymentActivity), countriesOfOperation: strings((q.answers as Row)?.countriesOfOperation), politicallyExposedPerson: Boolean((q.answers as Row)?.politicallyExposedPerson), sanctionsDeclaration: Boolean((q.answers as Row)?.sanctionsDeclaration), highRiskBusiness: Boolean((q.answers as Row)?.highRiskBusiness), thirdPartyPaymentProcessing: Boolean((q.answers as Row)?.thirdPartyPaymentProcessing), refundAndDisputeExpectations: string((q.answers as Row)?.refundAndDisputeExpectations) } } : null;
  const evidenceMetadata = s.evidence.filter(r => !r.removed_at).map((r): EvidenceMetadata => ({ id: id(r), category: string(r.category) as EvidenceMetadata['category'], ownerType: string(r.owner_type) as EvidenceMetadata['ownerType'], ownerId: string(r.owner_id) || undefined, storageReference: string(r.storage_reference_masked), mediaType: string(r.media_type) as EvidenceMetadata['mediaType'], sizeBytes: number(r.size_bytes), sha256: string(r.sha256), fileName: string(r.file_name), removedAt: null }));
  const informationRequests = (s.informationRequests ?? []).map((r): InformationRequest => ({ id: id(r), reason: string(r.reason), evidenceReference: string(r.evidence_reference), response: string(r.response) || null, requestedAt: string(r.requested_at), respondedAt: string(r.responded_at) || null }));
  const completePeople = directors.length > 0 && beneficialOwners.reduce((sum, owner) => sum + owner.ownershipBasisPoints, 0) === 10000 && representatives.length > 0;
  const currentStep = !p || addresses.length < 2 ? 1 : !completePeople ? 2 : !questionnaire ? 3 : evidenceMetadata.length === 0 ? 4 : 5;
  return { ...emptyDraft(), id: value.id, status: value.status, draftRevision: value.draft_revision, currentStep, business, addresses, directors, beneficialOwners, representatives, questionnaire, evidenceMetadata, informationRequests, declarationAccepted: Boolean(questionnaire?.declarationAccepted), owners: beneficialOwners.map(owner => ({ id: owner.id, fullName: owner.fullName, role: 'Beneficial owner', ownershipPercentage: owner.ownershipBasisPoints / 100, nationalIdNumber: owner.identificationNumber, isBeneficialOwner: true })), documents: evidenceMetadata.map(e => ({ id: e.id, category: e.category, fileName: e.fileName, sizeBytes: e.sizeBytes, status: 'UPLOADED', uploadProgress: 100 })), settlement: { accountNumberMasked: string(p?.settlement_account_masked) } };
}

export function normalizeMalawiPhone(value: string): string { const digits = value.replace(/\D/g, ''); return `+265${(digits.startsWith('265') ? digits.slice(3) : digits.replace(/^0/, '')).slice(0, 9)}`; }

export const merchantsApi = {
  async getBackendOnboarding(options?: RequestOptions): Promise<BackendOnboarding | null> { try { return await apiClient.get('/merchants/onboarding', options); } catch (error) { if (error instanceof ApiError && error.status === 404 && error.code === 'ONBOARDING_NOT_FOUND') return null; throw error; } },
  async getOnboarding(options?: RequestOptions): Promise<OnboardingDraft> { const value = await this.getBackendOnboarding(options); if (!value) return emptyDraft(); if (!('snapshot' in value)) { if (env.useMockApi) return value as unknown as OnboardingDraft; throw new ApiError({ status: 0, code: 'INVALID_RESPONSE', message: 'The onboarding response could not be verified.' }); } const draft = adaptBackendOnboarding(value); const history = await apiClient.get<{ data: Row[] }>('/merchants/onboarding/history', options); draft.timeline = history.data.map(row => ({ status: string(row.to_status) as OnboardingStatus, occurredAt: string(row.occurred_at), note: string(row.reason) || undefined })); return draft; },
  saveBusinessProfile: (profile: BusinessProfileInput) => apiClient.patch('/merchants/onboarding', { ...profile, taxIdentifier: profile.taxId, contactPhone: normalizeMalawiPhone(profile.contactPhone) }),
  addAddress: (value: AddressInput) => apiClient.post<{ id: string }>('/merchants/onboarding/addresses', value), removeAddress: (value: string) => apiClient.delete<void>(`/merchants/onboarding/addresses/${value}`),
  addDirector: (value: PersonInput) => apiClient.post<{ id: string }>('/merchants/onboarding/directors', value), removeDirector: (value: string) => apiClient.delete<void>(`/merchants/onboarding/directors/${value}`),
  addBeneficialOwner: (value: OwnerInput) => apiClient.post<{ id: string }>('/merchants/onboarding/beneficial-owners', value), removeBeneficialOwner: (value: string) => apiClient.delete<void>(`/merchants/onboarding/beneficial-owners/${value}`),
  addAuthorizedRepresentative: (value: RepresentativeInput) => apiClient.post<{ id: string }>('/merchants/onboarding/authorized-representatives', { ...value, telephone: normalizeMalawiPhone(value.telephone) }), removeAuthorizedRepresentative: (value: string) => apiClient.delete<void>(`/merchants/onboarding/authorized-representatives/${value}`),
  saveQuestionnaire: (value: QuestionnaireInput) => apiClient.put('/merchants/onboarding/questionnaire', value),
  registerEvidence: (value: EvidenceInput) => apiClient.post('/merchants/onboarding/evidence', value), removeEvidence: (value: string) => apiClient.delete<void>(`/merchants/onboarding/evidence/${value}`),
  async uploadDocument(payload: { category: string; file: File }, options?: { signal?: AbortSignal; onProgress?: (percent: number) => void }): Promise<{ id: string; fileName: string; sizeBytes: number }> { if (!env.useMockApi) throw new ApiError({ status: 503, code: 'BINARY_STORAGE_UNAVAILABLE', message: 'File upload is not enabled. Register evidence metadata only after storing the file in an approved secure service.' }); const form = new FormData(); form.append('category', payload.category); form.append('file', payload.file); const result = await apiClient.uploadFile<unknown>('/merchants/onboarding/documents', form, options); const candidate = result as Record<string, unknown> | null; if (!candidate || typeof candidate.id !== 'string' || typeof candidate.fileName !== 'string' || typeof candidate.sizeBytes !== 'number') throw new ApiError({ status: 0, code: 'INVALID_RESPONSE', message: 'The upload could not be confirmed. Please try again.' }); return { id: candidate.id, fileName: candidate.fileName, sizeBytes: candidate.sizeBytes }; },
  submitOnboarding: (idempotencyKey: string = crypto.randomUUID()) => apiClient.post<{ id: string; status: 'SUBMITTED'; message: string }>('/merchants/onboarding/submit', {}, { idempotencyKey }),
  respondToInformationRequest: (requestId: string, response: string) => apiClient.post('/merchants/onboarding/information-response', { requestId, response }),
  resubmit: () => apiClient.post('/merchants/onboarding/resubmit', {}), history: () => apiClient.get<{ data: Row[] }>('/merchants/onboarding/history'),
};
