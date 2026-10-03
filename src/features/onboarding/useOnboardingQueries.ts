import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { merchantsApi, type AddressInput, type BusinessProfileInput, type EvidenceInput, type OwnerInput, type PersonInput, type QuestionnaireInput, type RepresentativeInput } from '@/services/api/merchants';

export const ONBOARDING_QUERY_KEY = ['onboarding', 'draft'];
export function useOnboardingDraft() { return useQuery({ queryKey: ONBOARDING_QUERY_KEY, queryFn: ({ signal }) => merchantsApi.getOnboarding({ signal }) }); }

export type OnboardingAction =
  | { type: 'business'; value: BusinessProfileInput }
  | { type: 'add-address'; value: AddressInput } | { type: 'remove-address'; id: string }
  | { type: 'add-director'; value: PersonInput } | { type: 'remove-director'; id: string }
  | { type: 'add-owner'; value: OwnerInput } | { type: 'remove-owner'; id: string }
  | { type: 'add-representative'; value: RepresentativeInput } | { type: 'remove-representative'; id: string }
  | { type: 'questionnaire'; value: QuestionnaireInput }
  | { type: 'add-evidence'; value: EvidenceInput; idempotencyKey: string } | { type: 'remove-evidence'; id: string }
  | { type: 'information-response'; requestId: string; response: string } | { type: 'resubmit' };

export function useOnboardingAction() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: async (action: OnboardingAction) => {
    switch (action.type) {
      case 'business': return merchantsApi.saveBusinessProfile(action.value);
      case 'add-address': return merchantsApi.addAddress(action.value);
      case 'remove-address': return merchantsApi.removeAddress(action.id);
      case 'add-director': return merchantsApi.addDirector(action.value);
      case 'remove-director': return merchantsApi.removeDirector(action.id);
      case 'add-owner': return merchantsApi.addBeneficialOwner(action.value);
      case 'remove-owner': return merchantsApi.removeBeneficialOwner(action.id);
      case 'add-representative': return merchantsApi.addAuthorizedRepresentative(action.value);
      case 'remove-representative': return merchantsApi.removeAuthorizedRepresentative(action.id);
      case 'questionnaire': return merchantsApi.saveQuestionnaire(action.value);
      case 'add-evidence': return merchantsApi.registerEvidence(action.value, action.idempotencyKey);
      case 'remove-evidence': return merchantsApi.removeEvidence(action.id);
      case 'information-response': return merchantsApi.respondToInformationRequest(action.requestId, action.response);
      case 'resubmit': return merchantsApi.resubmit();
    }
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }) });
}

export function useSubmitOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (idempotencyKey: string) => merchantsApi.submitOnboarding(idempotencyKey), onSuccess: () => queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }) });
}
