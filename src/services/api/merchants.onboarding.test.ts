import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { adaptBackendOnboarding, merchantsApi, type BackendOnboarding } from './merchants';

const base = `${env.apiUrl}/v1`;
const backend: BackendOnboarding = {
  id: 'onb_1', status: 'INFORMATION_REQUIRED', draft_revision: 7, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
  snapshot: {
    businessProfile: { legal_name: 'Merchant Ltd', trading_name: 'Merchant', registration_number_masked: '****1234', tax_identifier_masked: '****9876', business_type: 'LIMITED_COMPANY', industry: 'Software testing', incorporation_country: 'MW', operating_country: 'MW', contact_email: 'ops@example.invalid', contact_phone: '+265999000001', website: 'https://example.invalid', expected_monthly_volume_min: 1, expected_monthly_volume_max: 10, expected_monthly_value_min: 100, expected_monthly_value_max: 1000, intended_channels: ['CARD'], settlement_account_masked: '****0001' },
    addresses: [{ id: 'adr_1', kind: 'REGISTERED', line1: 'One Road', city: 'Blantyre', country: 'MW' }, { id: 'adr_2', kind: 'OPERATING', line1: 'Two Road', city: 'Lilongwe', country: 'MW' }],
    directors: [{ id: 'dir_1', full_name: 'Director One', email: 'director@example.invalid', nationality: 'MW', identification_masked: '****1111' }],
    beneficialOwners: [{ id: 'own_1', full_name: 'Owner One', nationality: 'MW', ownership_basis_points: 10000, identification_masked: '****2222' }],
    authorizedRepresentatives: [{ id: 'rep_1', full_name: 'Representative One', email: 'rep@example.invalid', telephone: '+265999000002', authority: 'Authorized representative', identification_masked: '****3333' }],
    questionnaire: { version: '2026-01', declaration_accepted: true, answers: { natureOfBusiness: 'Software testing services', sourceOfFunds: 'Customer service revenue', expectedPaymentActivity: 'Sandbox card transactions', countriesOfOperation: ['MW'], politicallyExposedPerson: false, sanctionsDeclaration: false, highRiskBusiness: false, thirdPartyPaymentProcessing: false, refundAndDisputeExpectations: 'Occasional sandbox refunds' } },
    evidence: [{ id: 'evd_1', category: 'BUSINESS_REGISTRATION', owner_type: 'MERCHANT', storage_reference_masked: 'opaque-reference', media_type: 'application/pdf', size_bytes: 100, sha256: 'a'.repeat(64), file_name: 'registration.pdf', removed_at: null }],
    informationRequests: [{ id: 'irq_1', reason: 'Clarify the operating address', evidence_reference: 'review-1', response: null, requested_at: '2026-01-02T00:00:00Z', responded_at: null }],
  },
};

describe('granular onboarding API contract', () => {
  it('adapts the complete masked backend snapshot without inventing raw secrets', () => {
    const result = adaptBackendOnboarding(backend);
    expect(result).toMatchObject({ id: 'onb_1', status: 'INFORMATION_REQUIRED', draftRevision: 7, currentStep: 5 });
    expect(result.addresses.map(x => x.kind)).toEqual(['REGISTERED', 'OPERATING']);
    expect(result.beneficialOwners[0].ownershipBasisPoints).toBe(10000);
    expect(result.questionnaire?.version).toBe('2026-01');
    expect(result.informationRequests[0].id).toBe('irq_1');
    expect(result.business.registrationNumber).toBe('****1234');
    expect(JSON.stringify(result)).not.toContain('storage/secret');
  });

  it('treats only ONBOARDING_NOT_FOUND as a new empty application', async () => {
    server.use(http.get(`${base}/merchants/onboarding`, () => HttpResponse.json({ error: { code: 'ONBOARDING_NOT_FOUND', message: 'Not found' } }, { status: 404 })));
    await expect(merchantsApi.getOnboarding()).resolves.toMatchObject({ id: null, status: 'DRAFT', currentStep: 1 });
  });

  it('hydrates application history from the server after the snapshot', async () => {
    server.use(
      http.get(`${base}/merchants/onboarding`, () => HttpResponse.json(backend)),
      http.get(`${base}/merchants/onboarding/history`, () => HttpResponse.json({ data: [{ to_status: 'INFORMATION_REQUIRED', occurred_at: '2026-01-02T00:00:00Z', reason: 'Clarification required' }] })),
    );
    await expect(merchantsApi.getOnboarding()).resolves.toMatchObject({ timeline: [{ status: 'INFORMATION_REQUIRED', occurredAt: '2026-01-02T00:00:00Z', note: 'Clarification required' }] });
  });

  it('uses every granular save route with backend field names and a stable submit key', async () => {
    const seen: Array<{ method: string; path: string; body: unknown; key: string | null }> = [];
    server.use(http.all(`${base}/merchants/onboarding/*`, async ({ request }) => { const url = new URL(request.url); const body = request.method === 'DELETE' ? null : await request.json().catch(() => null); seen.push({ method: request.method, path: url.pathname, body, key: request.headers.get('idempotency-key') }); return request.method === 'DELETE' ? new HttpResponse(null, { status: 204 }) : HttpResponse.json({ id: 'saved', status: 'SUBMITTED', message: 'ok' }, { status: request.method === 'POST' ? 201 : 200 }); }));
    await merchantsApi.addAddress({ kind:'REGISTERED',line1:'One Road',line2:'',city:'Blantyre',region:'Southern',postalCode:'',country:'MW' });
    await merchantsApi.addDirector({ fullName:'Director',email:'director@example.invalid',nationality:'MW',identificationNumber:'TEST-ID' });
    await merchantsApi.addBeneficialOwner({ fullName:'Owner',email:'',nationality:'MW',identificationNumber:'TEST-ID-2',ownershipBasisPoints:10000 });
    await merchantsApi.addAuthorizedRepresentative({ fullName:'Representative',email:'rep@example.invalid',telephone:'+265 999 000 001',authority:'Authorized representative',identificationNumber:'' });
    await merchantsApi.saveQuestionnaire({ version:'2026-01',declarationAccepted:true,answers:{natureOfBusiness:'Software testing services',sourceOfFunds:'Customer service revenue',expectedPaymentActivity:'Sandbox card transactions',countriesOfOperation:['MW'],politicallyExposedPerson:false,sanctionsDeclaration:false,highRiskBusiness:false,thirdPartyPaymentProcessing:false,refundAndDisputeExpectations:'Occasional sandbox refunds'} });
    await merchantsApi.registerEvidence({ category:'BUSINESS_REGISTRATION',ownerType:'MERCHANT',storageReference:'opaque/object/1',mediaType:'application/pdf',sizeBytes:100,sha256:'a'.repeat(64),fileName:'registration.pdf' });
    await merchantsApi.respondToInformationRequest('irq_1','The address is a fictional sandbox location.');
    await merchantsApi.resubmit();
    await merchantsApi.submitOnboarding('stable-submission-key');
    expect(seen.map(x => x.path)).toEqual(expect.arrayContaining(['/v1/merchants/onboarding/addresses','/v1/merchants/onboarding/directors','/v1/merchants/onboarding/beneficial-owners','/v1/merchants/onboarding/authorized-representatives','/v1/merchants/onboarding/questionnaire','/v1/merchants/onboarding/evidence','/v1/merchants/onboarding/information-response','/v1/merchants/onboarding/resubmit','/v1/merchants/onboarding/submit']));
    expect(seen.find(x => x.path.endsWith('/questionnaire'))?.body).toMatchObject({ version: '2026-01' });
    expect(seen.find(x => x.path.endsWith('/submit'))?.key).toBe('stable-submission-key');
  });
});
