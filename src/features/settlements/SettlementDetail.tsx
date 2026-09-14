import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { useSettlementDetail } from './useSettlementsQueries';
import type { SettlementTransaction } from '@/types/settlements';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{value}</dd>
    </div>
  );
}

export function SettlementDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useSettlementDetail(id);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState title="We couldn't load this settlement" message={query.error instanceof ApiError ? query.error.message : 'Please try again.'} onRetry={() => query.refetch()} />;
  }

  const settlement = query.data;

  const columns: DataTableColumn<SettlementTransaction>[] = [
    { id: 'reference', header: 'Reference', cell: (t) => <Link to={`/transactions/${t.id}`} className="font-medium tabular-nums text-[var(--color-blue-600)] hover:underline">{t.reference}</Link> },
    { id: 'amount', header: 'Net amount', numeric: true, cell: (t) => <AmountDisplay amountMinor={t.amount.amountMinor} currency={t.amount.currency} size="sm" /> },
    { id: 'date', header: 'Payment date', cell: (t) => format(new Date(t.createdAt), 'd MMM yyyy'), hideBelow: 'sm' },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Settlements', to: '/settlements' }, { label: settlement.reference }]} />}
        title={settlement.reference}
        actions={<StatusBadge status={settlement.status} />}
      />

      <Card>
        <CardContent>
          <AmountDisplay amountMinor={settlement.amount.amountMinor} currency={settlement.amount.currency} size="xl" />
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Period" value={`${format(new Date(settlement.periodStart), 'd MMM yyyy')} – ${format(new Date(settlement.periodEnd), 'd MMM yyyy')}`} />
            <Field label="Destination" value={<span className="tabular-nums">{settlement.destinationMasked}</span>} />
            <Field label="Transactions included" value={settlement.transactionCount} />
            <Field label="Created" value={format(new Date(settlement.createdAt), 'd MMM yyyy, HH:mm')} />
            <Field label="Completed" value={settlement.completedAt ? format(new Date(settlement.completedAt), 'd MMM yyyy, HH:mm') : 'Not yet completed'} />
          </dl>

          {settlement.status !== 'COMPLETED' && (
            <div className="mt-4">
              <Alert variant="info">
                This settlement is {settlement.status.toLowerCase()}. The payments included were already confirmed by GiantPay — settlement is a separate payout step and can take longer to complete.
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Included transactions</CardTitle>
        </CardHeader>
        <div className="p-5 pt-0">
          <DataTable
            caption={`Transactions in ${settlement.reference}`}
            columns={columns}
            data={settlement.transactions}
            getRowKey={(t) => t.id}
            emptyTitle="No transactions"
          />
        </div>
      </Card>
    </div>
  );
}
