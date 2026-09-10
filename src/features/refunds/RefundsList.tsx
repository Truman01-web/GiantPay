import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useRefundsList } from './useRefundsQueries';
import { RequestRefundDialog } from './RequestRefundDialog';
import type { Refund } from '@/types/payments';
import { format } from 'date-fns';

export function RefundsList() {
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');

  const query = useRefundsList({ page, pageSize: 20 });

  const columns: DataTableColumn<Refund>[] = [
    { id: 'reference', header: 'Refund reference', cell: (r) => <span className="font-medium tabular-nums">{r.reference}</span> },
    { id: 'payment', header: 'Original payment', cell: (r) => r.paymentReference, hideBelow: 'sm' },
    { id: 'amount', header: 'Amount', numeric: true, cell: (r) => <AmountDisplay amountMinor={r.amount.amountMinor} currency={r.amount.currency} size="sm" /> },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'reason', header: 'Reason', cell: (r) => <span className="line-clamp-1">{r.reason}</span>, hideBelow: 'lg' },
    { id: 'requestedBy', header: 'Requested by', cell: (r) => r.requestedBy.name, hideBelow: 'md' },
    { id: 'approvedBy', header: 'Approved by', cell: (r) => r.approvedBy?.name ?? '—', hideBelow: 'lg' },
    { id: 'created', header: 'Created', cell: (r) => format(new Date(r.createdAt), 'd MMM yyyy'), hideBelow: 'md' },
  ];

  return (
    <div>
      <PageHeader title="Refunds" description="Track refund requests and their approval status." />

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'We could not load refunds.'} onRetry={() => query.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Refunds"
            columns={columns}
            data={query.data?.data ?? []}
            getRowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/refunds/${r.id}`)}
            loading={query.isPending}
            emptyTitle="No refunds yet"
            emptyDescription="Refund requests will appear here once submitted from a transaction."
          />
          {query.data && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination page={page} pageSize={20} total={query.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {paymentId && (
        <RequestRefundDialog
          paymentId={paymentId}
          onOpenChange={(open) => {
            if (!open) {
              const next = new URLSearchParams(searchParams);
              next.delete('paymentId');
              setSearchParams(next, { replace: true });
            }
          }}
          onSuccess={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('paymentId');
            setSearchParams(next, { replace: true });
          }}
        />
      )}
    </div>
  );
}
