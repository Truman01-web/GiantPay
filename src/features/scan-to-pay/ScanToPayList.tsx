import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/data-display/Pagination';
import { ErrorState } from '@/components/feedback/ErrorState';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import { useScanToPayList } from './useScanToPayQueries';
import type { ScanToPayCode } from '@/types/scanToPay';

export function ScanToPayList() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const navigate = useNavigate();
  const canManage = usePermission('payments.links:manage');

  const query = useScanToPayList({ page, pageSize });

  const columns: DataTableColumn<ScanToPayCode>[] = [
    {
      id: 'label',
      header: 'Label',
      cell: (code: ScanToPayCode) => (
        <span className="font-medium text-[var(--color-blue-600)] hover:underline">
          {code.label}
        </span>
      ),
    },
    {
      id: 'mode',
      header: 'Mode',
      cell: (code: ScanToPayCode) => (code.mode === 'FIXED' ? 'Fixed amount' : 'Customer entered'),
    },
    {
      id: 'amount',
      header: 'Amount',
      numeric: true,
      cell: (code: ScanToPayCode) =>
        code.amountMinor != null ? (
          <AmountDisplay amountMinor={code.amountMinor} currency={code.currency} size="sm" />
        ) : (
          <span className="text-[var(--color-neutral-500)] text-xs">Customer entered</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (code: ScanToPayCode) => <StatusBadge status={code.status} />,
    },
    {
      id: 'successful',
      header: 'Payments',
      numeric: true,
      cell: (code: ScanToPayCode) => code.successfulPaymentsCount,
      hideBelow: 'sm',
    },
    {
      id: 'created',
      header: 'Created',
      cell: (code: ScanToPayCode) => format(new Date(code.createdAt), 'd MMM yyyy'),
      hideBelow: 'md',
    },
    {
      id: 'expires',
      header: 'Expires',
      cell: (code: ScanToPayCode) => (code.expiresAt ? format(new Date(code.expiresAt), 'd MMM yyyy') : 'Never'),
      hideBelow: 'lg',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Scan to Pay"
        description="Create QR codes for counters, tills, or invoices to accept instant customer payments."
        actions={
          canManage ? (
            <Button asChild>
              <Link to="/scan-to-pay/create">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create QR Code
              </Link>
            </Button>
          ) : undefined
        }
      />

      {query.isError ? (
        <div className="mt-4">
          <ErrorState
            message={
              query.error instanceof ApiError
                ? query.error.message
                : 'We could not load your scan-to-pay codes.'
            }
            onRetry={() => query.refetch()}
          />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable
            caption="Scan to Pay codes"
            columns={columns}
            data={query.data?.data ?? []}
            getRowKey={(code: ScanToPayCode) => code.id}
            onRowClick={(code: ScanToPayCode) => navigate(`/scan-to-pay/${code.id}`)}
            loading={query.isPending}
            emptyTitle="No scan-to-pay QR codes yet"
            emptyDescription={
              canManage
                ? 'Create your first QR code to accept payments at your till or counter.'
                : 'QR codes will appear here once created.'
            }
          />

          {query.data && query.data.total > pageSize && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={query.data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
