import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_ONBOARDING_DRAFT } from '../fixtures/onboarding';
import type { OnboardingDraft } from '@/types/onboarding';

const base = `${env.apiUrl}/v1`;
let draft: OnboardingDraft = structuredClone(MOCK_ONBOARDING_DRAFT);

/** See resetAuthMockState in ../handlers/auth.ts for why this is needed
 * between tests under this project's `isolate: false` vitest config. */
export function resetMerchantsMockState(): void {
  draft = structuredClone(MOCK_ONBOARDING_DRAFT);
}

export const merchantsHandlers = [
  http.get(`${base}/merchants/onboarding`, () => HttpResponse.json(draft)),

  http.patch(`${base}/merchants/onboarding`, async ({ request }) => {
    const body = (await request.json()) as Partial<OnboardingDraft>;
    draft = { ...draft, ...body };
    return HttpResponse.json(draft);
  }),

  http.post(`${base}/merchants/onboarding/submit`, () => {
    draft = {
      ...draft,
      status: 'SUBMITTED',
      timeline: [...draft.timeline, { status: 'SUBMITTED', occurredAt: new Date().toISOString() }],
    };
    return HttpResponse.json(draft);
  }),

  http.post(`${base}/merchants/onboarding/documents`, async () => {
    return HttpResponse.json({
      id: `doc_${Math.random().toString(36).slice(2, 9)}`,
      fileName: 'uploaded-file',
      sizeBytes: 102400,
    });
  }),
];
