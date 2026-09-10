import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Ban } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import { usePaymentLinkDetail, useDisablePaymentLink } from './usePaymentLinksQueries';
import { format } from 'date-fns';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{value}</dd>
    </div>
  );
}

export function PaymentLinkDetail() {
  const { id } = useParams<{ id: string }>();
  const [confirmDisable, setConfirmDisable] = useState(false);
  const query = usePaymentLinkDetail(id);
  const disableLink = useDisablePaymentLink();
  const canManage = usePermission('payments.links:manage');

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState title="We couldn't load this link" message={query.error instanceof ApiError ? query.error.message : 'Please try again.'} onRetry={() => query.refetch()} />;
  }

  const link = query.data;

  return (
    <div>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Payment links', to: '/payment-links' }, { label: link.name }]} />}
        title={link.name}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={link.status} />
            {canManage && link.status === 'ACTIVE' && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDisable(true)}>
                <Ban className="h-4 w-4" aria-hidden="true" />
                Disable link
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-3">
              <span className="truncate text-[length:var(--text-label)] text-[var(--color-neutral-700)]">{link.url}</span>
              <div className="flex shrink-0 items-center gap-1">
                <CopyButton value={link.url} />
                <Button asChild size="sm" variant="ghost">
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Amount" value={link.amount ? <AmountDisplay amountMinor={link.amount.amountMinor} currency={link.amount.currency} size="sm" /> : 'Customer entered'} />
              <Field label="Type" value={link.reusable ? 'Reusable' : 'Single-use'} />
              <Field label="Max successful payments" value={link.maxSuccessfulPayments ?? 'Unlimited'} />
              <Field label="Successful payments" value={link.successfulPaymentsCount} />
              <Field label="Created" value={format(new Date(link.createdAt), 'd MMM yyyy')} />
              <Field label="Expires" value={link.expiresAt ? format(new Date(link.expiresAt), 'd MMM yyyy') : 'Never'} />
              <Field label="Customer reference" value={link.customerReference ?? '—'} />
              <Field label="Redirect URL" value={link.redirectUrl ?? '—'} />
            </dl>
            {link.description && (
              <div className="mt-4 border-t border-[var(--color-neutral-200)] pt-4">
                <Field label="Description" value={link.description} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Disable this payment link?"
        description="Customers will no longer be able to pay through this link. This cannot be undone from here."
        destructive
        confirmLabel="Disable link"
        loading={disableLink.isPending}
        onConfirm={() =>
          disableLink.mutate(link.id, {
            onSuccess: () => setConfirmDisable(false),
          })
        }
      />
    </div>
  );
}
