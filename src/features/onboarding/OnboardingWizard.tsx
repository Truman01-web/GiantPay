import { useState } from 'react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useOnboardingDraft } from './useOnboardingQueries';
import { GranularOnboardingForm } from './GranularOnboardingForm';
import { ApplicationStatusView } from './ApplicationStatusView';

export function OnboardingWizard() {
  const draftQuery = useOnboardingDraft();
  const [editingInformation, setEditingInformation] = useState(false);
  if (draftQuery.isPending) return <FullPageLoader label="Loading your application…" />;
  if (draftQuery.isError || !draftQuery.data) return <ErrorState message={draftQuery.error instanceof ApiError ? draftQuery.error.message : 'We could not load your application.'} onRetry={() => draftQuery.refetch()} />;
  const draft = draftQuery.data;
  const editable = draft.status === 'DRAFT' || draft.status === 'INFORMATION_REQUIRED';
  if (!editable || (draft.status === 'INFORMATION_REQUIRED' && !editingInformation)) return <div><PageHeader title="Merchant application" /><ApplicationStatusView draft={draft} onEditInformation={() => setEditingInformation(true)} /></div>;
  return <div><PageHeader title="Complete your merchant application" description="Internal sandbox review only; this is not regulatory, bank, network, provider, or production approval." /><GranularOnboardingForm draft={draft} onCancelInformation={() => setEditingInformation(false)} /></div>;
}
