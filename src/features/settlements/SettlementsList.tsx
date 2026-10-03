import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useSettlementsList } from './useSettlementsQueries';
import type { SettlementListItem } from '@/types/settlements';
import { usePermission } from '@/hooks/useSession';
import { formatMinorUnitsExact } from '@/lib/money';
import { CreateSettlementDialog } from './CreateSettlementDialog';

export function SettlementsList() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const canManage = usePermission('settlements:manage');
  const [creating, setCreating] = useState(false);
  const query = useSettlementsList({ page, pageSize: 20 });

  const columns: DataTableColumn<SettlementListItem>[] = [
    { id: 'reference', header: 'Batch reference', cell: (s) => <span className="font-medium tabular-nums">{s.id}</span> },
    { id: 'amount', header: 'Net amount', numeric: true, cell: (s) => <span className="tabular-nums font-medium">{formatMinorUnitsExact(s.netMinor, s.currency)}</span> },
    { id: 'period', header: 'Period', cell: (s) => format(new Date(s.periodStart), 'd MMM yyyy'), hideBelow: 'sm' },
    { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    { id: 'sandbox', header: 'Environment', cell: () => 'Sandbox only', hideBelow: 'md' },
    { id: 'approved', header: 'Approved', cell: (s) => (s.approvedAt ? format(new Date(s.approvedAt), 'd MMM yyyy') : '—'), hideBelow: 'lg' },
  ];

  return (
    <div>
      <PageHeader title="Settlement batches" description="Sandbox accounting records only; no bank or mobile-money payout is executed." actions={canManage ? <Button onClick={() => setCreating(true)}>Create batch</Button> : undefined} />

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
            emptyDescription="Sandbox settlement batches will appear here after eligible reconciliations."
          />
          {query.data && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination page={page} pageSize={20} total={query.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
      <CreateSettlementDialog open={creating} onOpenChange={setCreating} onCreated={(id) => { setCreating(false); navigate(`/settlements/${id}`); }} />
    </div>
  );
}
