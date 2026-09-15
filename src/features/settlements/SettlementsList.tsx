import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useSettlementsList } from './useSettlementsQueries';
import type { SettlementListItem } from '@/types/settlements';

export function SettlementsList() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const query = useSettlementsList({ page, pageSize: 20 });

  const columns: DataTableColumn<SettlementListItem>[] = [
    { id: 'reference', header: 'Settlement reference', cell: (s) => <span className="font-medium tabular-nums">{s.reference}</span> },
    { id: 'amount', header: 'Amount', numeric: true, cell: (s) => <AmountDisplay amountMinor={s.amount.amountMinor} currency={s.amount.currency} size="sm" /> },
    { id: 'period', header: 'Period', cell: (s) => format(new Date(s.periodStart), 'd MMM yyyy'), hideBelow: 'sm' },
    { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    { id: 'destination', header: 'Destination', cell: (s) => <span className="tabular-nums">{s.destinationMasked}</span>, hideBelow: 'md' },
    { id: 'transactions', header: 'Transactions', numeric: true, cell: (s) => s.transactionCount, hideBelow: 'lg' },
    { id: 'completed', header: 'Completed', cell: (s) => (s.completedAt ? format(new Date(s.completedAt), 'd MMM yyyy') : '—'), hideBelow: 'lg' },
  ];

  return (
    <div>
      <PageHeader title="Settlements" description="Payouts to your settlement destination, batched from confirmed payments." />

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'We could not load settlements.'} onRetry={() => query.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Settlements"
            columns={columns}
            data={query.data?.data ?? []}
            getRowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/settlements/${s.id}`)}
            loading={query.isPending}
            emptyTitle="No settlements yet"
            emptyDescription="Settlement batches will appear here once payments become eligible for payout."
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
