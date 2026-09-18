import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { useSettlementDetail } from './useSettlementsQueries';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt><dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{value}</dd></div>;
}

export function SettlementDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useSettlementDetail(id);
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-56" /></div>;
  if (query.isError || !query.data) return <ErrorState title="We couldn't load this settlement batch" message={query.error instanceof ApiError ? query.error.message : 'Please try again.'} onRetry={() => query.refetch()} />;
  const batch = query.data;
  return (
    <div>
      <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: 'Settlement batches', to: '/settlements' }, { label: batch.id }]} />} title={batch.id} actions={<StatusBadge status={batch.status} />} />
      <Alert variant="info">Sandbox accounting record only. No external bank or mobile-money transfer was executed.</Alert>
      <Card className="mt-4"><CardContent>
        <AmountDisplay amountMinor={Number(batch.netMinor)} currency={batch.currency} size="xl" />
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Period" value={`${format(new Date(batch.periodStart), 'd MMM yyyy')} – ${format(new Date(batch.periodEnd), 'd MMM yyyy')}`} />
          <Field label="Gross" value={<AmountDisplay amountMinor={Number(batch.grossMinor)} currency={batch.currency} size="sm" />} />
          <Field label="Refunds" value={<AmountDisplay amountMinor={Number(batch.refundsMinor)} currency={batch.currency} size="sm" />} />
          <Field label="Fees" value={<AmountDisplay amountMinor={Number(batch.feesMinor)} currency={batch.currency} size="sm" />} />
          <Field label="Approved" value={batch.approvedAt ? format(new Date(batch.approvedAt), 'd MMM yyyy, HH:mm') : 'Not approved'} />
          <Field label="Exported" value={batch.exportedAt ? format(new Date(batch.exportedAt), 'd MMM yyyy, HH:mm') : 'Not exported'} />
          <Field label="External transfer" value={batch.externalTransferExecuted ? 'Executed' : 'Not executed'} />
        </dl>
      </CardContent></Card>
    </div>
  );
}
