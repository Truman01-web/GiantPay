import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Timeline } from '@/components/data-display/Timeline';
import { Alert } from '@/components/feedback/Alert';
import type { OnboardingDraft } from '@/types/onboarding';

const NEXT_ACTION: Record<string, string> = {
  SUBMITTED: 'GiantPay has received your application and will begin review shortly.',
  UNDER_REVIEW: 'Our team is reviewing your application. This typically takes a few business days.',
  INFORMATION_REQUIRED: 'We need more information before we can continue. Check your email for details.',
  APPROVED: 'Your application is approved. Sandbox access is available now, with production access enabled per your account settings.',
  REJECTED: 'Your application was not approved. Contact support for details.',
  SUSPENDED: 'Your merchant account is currently suspended. Contact support to resolve this.',
};

export function ApplicationStatusView({ draft }: { draft: OnboardingDraft }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">Merchant application</p>
            <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">{NEXT_ACTION[draft.status] ?? 'Track your application status below.'}</p>
          </div>
          <StatusBadge status={draft.status} />
        </CardContent>
      </Card>

      {draft.status === 'REJECTED' && <Alert variant="danger">This application was rejected. See your email for the reason, or contact support to discuss next steps.</Alert>}
      {draft.status === 'SUSPENDED' && <Alert variant="warning">This merchant account is suspended. Payment processing is paused until this is resolved.</Alert>}

      <Card>
        <CardContent>
          <p className="mb-4 text-[length:var(--text-label)] font-semibold text-[var(--color-neutral-700)]">Timeline</p>
          <Timeline items={draft.timeline.map((t, i) => ({ id: `${t.status}-${i}`, label: t.status.replace(/_/g, ' '), occurredAt: t.occurredAt, detail: t.note }))} />
        </CardContent>
      </Card>
    </div>
  );
}
