import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/feedback/Alert';
import type { OnboardingDraft } from '@/types/onboarding';

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <dt className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="text-right text-[length:var(--text-label)] font-medium text-[var(--color-navy-900)]">{value || '—'}</dd>
    </div>
  );
}

export function ReviewStep({
  draft,
  submitting,
  onEditStep,
  onBack,
  onSubmit,
}: {
  draft: OnboardingDraft;
  submitting: boolean;
  onEditStep: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [declared, setDeclared] = useState(draft.declarationAccepted);
  const [touched, setTouched] = useState(false);

  function handleSubmit() {
    setTouched(true);
    if (!declared) return;
    onSubmit();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">Review and declaration</h2>
      <p className="text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Confirm everything below is accurate before submitting for review.</p>

      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl>
            <SummaryRow label="Legal name" value={draft.business.legalName} />
            <SummaryRow label="Trading name" value={draft.business.tradingName} />
            <SummaryRow label="Registration number" value={draft.business.registrationNumber} />
            <SummaryRow label="Contact" value={draft.business.contactEmail} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ownership</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl>
            <SummaryRow label="Owners listed" value={draft.owners.length} />
            {draft.owners.map((o) => (
              <SummaryRow key={o.id} label={o.fullName} value={o.role} />
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <SummaryRow label="Files uploaded" value={draft.documents.filter((d) => d.status === 'UPLOADED').length} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(4)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl>
            <SummaryRow label="Destination" value={draft.settlement.destinationType === 'MOBILE_MONEY' ? 'Mobile money' : 'Bank account'} />
            <SummaryRow label="Account" value={draft.settlement.accountNumberMasked ?? draft.settlement.mobileNumberMasked} />
          </dl>
        </CardContent>
      </Card>

      {touched && !declared && <Alert variant="danger">You must accept the declaration to submit your application.</Alert>}

      <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] p-4 text-[length:var(--text-label)] text-[var(--color-neutral-700)]">
        <Checkbox className="mt-0.5" checked={declared} onCheckedChange={(c) => setDeclared(c === true)} />
        I confirm the information provided is accurate and complete, and I am authorized to submit this application on behalf of the business.
      </label>

      <div className="flex justify-between border-t border-[var(--color-neutral-200)] pt-4">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          Submit application
        </Button>
      </div>
    </div>
  );
}
