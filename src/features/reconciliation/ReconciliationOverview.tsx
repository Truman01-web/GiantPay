import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { StatCard } from '@/components/data-display/StatCard';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useReconciliationRuns } from './useReconciliationQueries';
import type { ReconciliationRunListItem } from '@/types/reconciliation';

export function ReconciliationOverview() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const query = useReconciliationRuns({ page, pageSize: 20 });

  const latestRun = page === 1 ? query.data?.data[0] : undefined;

  const columns: DataTableColumn<ReconciliationRunListItem>[] = [
    { id: 'provider', header: 'Provider', cell: (r) => <span className="font-medium">{r.provider}</span> },
    { id: 'period', header: 'Period', cell: (r) => format(new Date(r.periodStart), 'd MMM yyyy') },
    { id: 'total', header: 'Total records', numeric: true, cell: (r) => r.totalRecords, hideBelow: 'sm' },
    { id: 'matched', header: 'Matched', numeric: true, cell: (r) => r.matchedCount, hideBelow: 'md' },
    { id: 'unmatched', header: 'Unmatched', numeric: true, cell: (r) => r.unmatchedCount, hideBelow: 'md' },
    {
      id: 'exceptions',
      header: 'Exceptions',
      numeric: true,
      cell: (r) => <span className={r.exceptionCount > 0 ? 'font-medium text-[var(--color-red-600)]' : ''}>{r.exceptionCount}</span>,
    },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'completed', header: 'Completed', cell: (r) => (r.completedAt ? format(new Date(r.completedAt), 'd MMM yyyy, HH:mm') : '—'), hideBelow: 'lg' },
  ];

  return (
    <div>
      <PageHeader title="Reconciliation" description="Matched, unmatched and exception tracking against provider settlement files." />

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'We could not load reconciliation runs.'} onRetry={() => query.refetch()} />
      ) : (
        <>
          {latestRun && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Matched (latest run)" value={latestRun.matchedCount} />
              <StatCard label="Unmatched (latest run)" value={latestRun.unmatchedCount} />
              <StatCard
                label="Exceptions (latest run)"
                value={latestRun.exceptionCount}
                trend={latestRun.exceptionCount > 0 ? { direction: 'down', label: 'Needs attention' } : { direction: 'up', label: 'All clear' }}
              />
              <StatCard
                label="Last completed run"
                value={latestRun.completedAt ? format(new Date(latestRun.completedAt), 'd MMM, HH:mm') : 'None yet'}
              />
            </div>
          )}

          <DataTable
            caption="Reconciliation runs"
            columns={columns}
            data={query.data?.data ?? []}
            getRowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/reconciliation/${r.id}`)}
            loading={query.isPending}
            emptyTitle="No reconciliation runs yet"
            emptyDescription="Runs will appear here once GiantPay reconciles payments against provider settlement files."
          />
          {query.data && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination page={page} pageSize={20} total={query.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
