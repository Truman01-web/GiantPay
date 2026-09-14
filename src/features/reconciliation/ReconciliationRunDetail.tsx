import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { StatCard } from '@/components/data-display/StatCard';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { toast } from '@/components/feedback/toastStore';
import { usePermission } from '@/hooks/useSession';
import { useReconciliationRun } from './useReconciliationQueries';
import { UpdateExceptionDialog } from './UpdateExceptionDialog';
import type { ReconciliationException } from '@/types/reconciliation';

const TYPE_LABELS: Record<ReconciliationException['type'], string> = {
  AMOUNT_MISMATCH: 'Amount mismatch',
  STATUS_MISMATCH: 'Status mismatch',
  MISSING_IN_PROVIDER: 'Missing at provider',
  MISSING_IN_LEDGER: 'Missing in ledger',
};

export function ReconciliationRunDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useReconciliationRun(id);
  const canManage = usePermission('reconciliation:manage');
  const [activeException, setActiveException] = useState<ReconciliationException | null>(null);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState title="We couldn't load this reconciliation run" message={query.error instanceof ApiError ? query.error.message : 'Please try again.'} onRetry={() => query.refetch()} />;
  }

  const run = query.data;

  const columns: DataTableColumn<ReconciliationException>[] = [
    { id: 'transaction', header: 'Transaction', cell: (e) => <Link to={`/transactions/${e.transactionId}`} className="font-medium tabular-nums text-[var(--color-blue-600)] hover:underline">{e.transactionReference}</Link> },
    { id: 'type', header: 'Type', cell: (e) => TYPE_LABELS[e.type] },
    { id: 'expected', header: 'Expected', cell: (e) => e.expected, hideBelow: 'md' },
    { id: 'observed', header: 'Observed', cell: (e) => e.observed, hideBelow: 'md' },
    { id: 'difference', header: 'Difference', cell: (e) => e.difference ?? '—', hideBelow: 'lg' },
    { id: 'owner', header: 'Owner', cell: (e) => e.owner?.name ?? 'Unassigned', hideBelow: 'lg' },
    {
      id: 'priority',
      header: 'Priority',
      cell: (e) => (
        <span
          className={
            e.priority === 'HIGH' ? 'font-medium text-[var(--color-red-600)]' : e.priority === 'MEDIUM' ? 'text-[var(--color-amber-700)]' : 'text-[var(--color-neutral-600)]'
          }
        >
          {e.priority}
        </span>
      ),
    },
    { id: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
    {
      id: 'action',
      header: 'Action',
      cell: (e) =>
        canManage ? (
          <Button variant="secondary" size="sm" onClick={() => setActiveException(e)}>
            Update
          </Button>
        ) : (
          <span className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">View only</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Reconciliation', to: '/reconciliation' }, { label: run.provider }]} />}
        title={`${run.provider} — ${format(new Date(run.periodStart), 'd MMM yyyy')}`}
        actions={<StatusBadge status={run.status} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total records" value={run.totalRecords} />
        <StatCard label="Matched" value={run.matchedCount} />
        <StatCard label="Unmatched" value={run.unmatchedCount} />
        <StatCard label="Exceptions" value={run.exceptionCount} trend={run.exceptionCount > 0 ? { direction: 'down', label: 'Needs attention' } : { direction: 'up', label: 'All clear' }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Run ID</dt>
              <dd className="mt-0.5 text-[length:var(--text-body)] tabular-nums text-[var(--color-navy-900)]">{run.id}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Period</dt>
              <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">
                {format(new Date(run.periodStart), 'd MMM yyyy')} – {format(new Date(run.periodEnd), 'd MMM yyyy')}
              </dd>
            </div>
            <div>
              <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Completed</dt>
              <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{run.completedAt ? format(new Date(run.completedAt), 'd MMM yyyy, HH:mm') : 'Not yet'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Exceptions</CardTitle>
        </CardHeader>
        <div className="p-5 pt-0">
          <DataTable
            caption={`Exceptions for ${run.id}`}
            columns={columns}
            data={run.exceptions}
            getRowKey={(e) => e.id}
            emptyTitle="No exceptions in this run"
            emptyDescription="Every transaction in this period matched its provider settlement record."
          />
        </div>
      </Card>

      {activeException && (
        <UpdateExceptionDialog
          runId={run.id}
          exception={activeException}
          onOpenChange={(open) => {
            if (!open) setActiveException(null);
          }}
          onSuccess={() => {
            setActiveException(null);
            toast({ variant: 'success', title: 'Exception updated' });
          }}
        />
      )}
    </div>
  );
}
