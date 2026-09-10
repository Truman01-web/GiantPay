import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useOnboardingDraft, useSaveOnboardingDraft, useSubmitOnboarding } from './useOnboardingQueries';
import { StepProgress } from './StepProgress';
import { BusinessInfoStep } from './steps/BusinessInfoStep';
import { OwnersStep } from './steps/OwnersStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { SettlementStep } from './steps/SettlementStep';
import { ReviewStep } from './steps/ReviewStep';
import { ApplicationStatusView } from './ApplicationStatusView';

export function OnboardingWizard() {
  const draftQuery = useOnboardingDraft();
  const saveDraft = useSaveOnboardingDraft();
  const submitOnboarding = useSubmitOnboarding();
  const navigate = useNavigate();
  const [step, setStep] = useState<number | null>(null);

  if (draftQuery.isPending) return <FullPageLoader label="Loading your application…" />;

  if (draftQuery.isError || !draftQuery.data) {
    return <ErrorState message={draftQuery.error instanceof ApiError ? draftQuery.error.message : 'We could not load your application.'} onRetry={() => draftQuery.refetch()} />;
  }

  const draft = draftQuery.data;
  const currentStep = step ?? draft.currentStep;

  const isEditable = draft.status === 'DRAFT' || draft.status === 'INFORMATION_REQUIRED';

  if (!isEditable && step === null) {
    return (
      <div>
        <PageHeader title="Merchant application" />
        <ApplicationStatusView draft={draft} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Complete your merchant application" description="This information is reviewed by GiantPay before sandbox and production access are granted." />
      <Card>
        <CardContent>
          <StepProgress currentStep={currentStep} />

          {currentStep === 1 && (
            <BusinessInfoStep
              initialValues={draft.business}
              saving={saveDraft.isPending}
              onNext={async (values) => {
                await saveDraft.mutateAsync({ business: values, currentStep: 2 });
                setStep(2);
              }}
            />
          )}

          {currentStep === 2 && (
            <OwnersStep
              initialOwners={draft.owners}
              saving={saveDraft.isPending}
              onBack={() => setStep(1)}
              onNext={async (owners) => {
                await saveDraft.mutateAsync({ owners, currentStep: 3 });
                setStep(3);
              }}
            />
          )}

          {currentStep === 3 && (
            <DocumentsStep
              initialDocuments={draft.documents}
              saving={saveDraft.isPending}
              onBack={() => setStep(2)}
              onNext={async (documents) => {
                await saveDraft.mutateAsync({ documents, currentStep: 4 });
                setStep(4);
              }}
            />
          )}

          {currentStep === 4 && (
            <SettlementStep
              initialValues={draft.settlement}
              saving={saveDraft.isPending}
              onBack={() => setStep(3)}
              onNext={async (values) => {
                await saveDraft.mutateAsync({
                  settlement: {
                    destinationType: values.destinationType,
                    bankName: values.bankName,
                    accountNumberMasked: values.accountNumber ? `••••${values.accountNumber.slice(-4)}` : '',
                    mobileNumberMasked: values.mobileNumber ? `${values.mobileNumber.slice(0, 4)} •• •• ${values.mobileNumber.slice(-2)}` : '',
                  },
                  currentStep: 5,
                });
                setStep(5);
              }}
            />
          )}

          {currentStep === 5 && (
            <ReviewStep
              draft={draft}
              submitting={submitOnboarding.isPending}
              onEditStep={(s) => setStep(s)}
              onBack={() => setStep(4)}
              onSubmit={async () => {
                await saveDraft.mutateAsync({ declarationAccepted: true });
                await submitOnboarding.mutateAsync();
                navigate('/dashboard');
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
