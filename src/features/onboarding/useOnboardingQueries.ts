import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { merchantsApi } from '@/services/api/merchants';
import type { OnboardingDraft } from '@/types/onboarding';

const QUERY_KEY = ['onboarding', 'draft'];

export function useOnboardingDraft() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) => merchantsApi.getOnboarding({ signal }),
  });
}

export function useSaveOnboardingDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<OnboardingDraft>) => merchantsApi.saveOnboardingDraft(payload),
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
}

export function useSubmitOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => merchantsApi.submitOnboarding(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
