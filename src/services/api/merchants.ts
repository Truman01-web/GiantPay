import type { OnboardingDraft } from '@/types/onboarding';
import { apiClient } from './client';
import { ApiError } from './errors';
import { env } from '@/app/config/env';

function requireAggregateOnboardingAdapter(): void {
  if (!env.useMockApi) {
    throw new ApiError({ status: 503, code: 'FEATURE_UNAVAILABLE', message: 'Onboarding is temporarily unavailable while the granular sandbox workflow is connected.' });
  }
}

export interface UploadDocumentResult {
  id: string;
  fileName: string;
  sizeBytes: number;
}

/** A 200/201 response is not proof of a valid result — only a
 * successfully-parsed body carrying the fields this app actually needs is
 * treated as a real upload. Matches the exact fields the backend
 * contract/mock return; nothing invented beyond that. */
function isValidUploadResult(value: unknown): value is UploadDocumentResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && v.id.length > 0 && typeof v.fileName === 'string' && typeof v.sizeBytes === 'number';
}

export const merchantsApi = {
  getOnboarding: (options?: { signal?: AbortSignal }) => {
    requireAggregateOnboardingAdapter();
    return apiClient.get<OnboardingDraft>('/merchants/onboarding', options);
  },

  saveOnboardingDraft: (payload: Partial<OnboardingDraft>) => {
    requireAggregateOnboardingAdapter();
    return apiClient.patch<OnboardingDraft>('/merchants/onboarding', payload);
  },

  submitOnboarding: () => {
    requireAggregateOnboardingAdapter();
    return apiClient.post<OnboardingDraft>('/merchants/onboarding/submit');
  },

  uploadDocument: async (
    payload: { category: string; file: File },
    options?: { signal?: AbortSignal; onProgress?: (percent: number) => void },
  ): Promise<UploadDocumentResult> => {
    requireAggregateOnboardingAdapter();
    const form = new FormData();
    form.append('category', payload.category);
    form.append('file', payload.file);
    const result = await apiClient.uploadFile<unknown>('/merchants/onboarding/documents', form, options);

    if (!isValidUploadResult(result)) {
      // Diagnostic only — never the response body itself, which could
      // echo back file metadata we don't want in logs.
      console.error('[GiantPay] Upload response failed validation: /merchants/onboarding/documents');
      throw new ApiError({ status: 0, code: 'INVALID_RESPONSE', message: 'The upload could not be confirmed. Please try again.' });
    }

    return result;
  },
};
