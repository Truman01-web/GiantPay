import type { OnboardingDraft } from '@/types/onboarding';
import { apiClient } from './client';

export const merchantsApi = {
  getOnboarding: (options?: { signal?: AbortSignal }) =>
    apiClient.get<OnboardingDraft>('/merchants/onboarding', options),

  saveOnboardingDraft: (payload: Partial<OnboardingDraft>) =>
    apiClient.patch<OnboardingDraft>('/merchants/onboarding', payload),

  submitOnboarding: () => apiClient.post<OnboardingDraft>('/merchants/onboarding/submit'),

  uploadDocument: (
    payload: { category: string; file: File },
    options?: { signal?: AbortSignal; onProgress?: (percent: number) => void },
  ) => {
    const form = new FormData();
    form.append('category', payload.category);
    form.append('file', payload.file);
    return apiClient.uploadFile<{ id: string; fileName: string; sizeBytes: number }>(
      '/merchants/onboarding/documents',
      form,
      options,
    );
  },
};
