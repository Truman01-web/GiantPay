import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useRefundDetail } from './useRefundsQueries';
import { format } from 'date-fns';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{value}</dd>
    </div>
  );
}

export function RefundDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useRefundDetail(id);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState title="We couldn't load this refund" message={query.error instanceof ApiError ? query.error.message : 'Please try again.'} onRetry={() => query.refetch()} />;
  }

  const refund = query.data;

  return (
    <div>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Refunds', to: '/refunds' }, { label: refund.reference }]} />}
        title={refund.reference}
        actions={<StatusBadge status={refund.status} />}
      />

      <Card>
        <CardContent>
          <AmountDisplay amountMinor={refund.amount.amountMinor} currency={refund.amount.currency} size="xl" />
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Original payment" value={<Link to={`/transactions/${refund.paymentId}`} className="text-[var(--color-blue-600)] hover:underline">{refund.paymentReference}</Link>} />
            <Field label="Requested by" value={refund.requestedBy.name} />
            <Field label="Approved by" value={refund.approvedBy?.name ?? '—'} />
            <Field label="Created" value={format(new Date(refund.createdAt), 'd MMM yyyy, HH:mm')} />
            <Field label="Last updated" value={format(new Date(refund.updatedAt), 'd MMM yyyy, HH:mm')} />
          </dl>
          <div className="mt-4 border-t border-[var(--color-neutral-200)] pt-4">
            <Field label="Reason" value={refund.reason} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
