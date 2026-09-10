import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { FilterBar } from '@/components/forms/FilterBar';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import { usePaymentLinksList } from './usePaymentLinksQueries';
import type { PaymentLink } from '@/types/payments';
import { format } from 'date-fns';

export function PaymentLinksList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const canManage = usePermission('payments.links:manage');

  const query = usePaymentLinksList({ page, pageSize: 20, search: search || undefined });

  const columns: DataTableColumn<PaymentLink>[] = [
    { id: 'name', header: 'Name', cell: (l) => <span className="font-medium">{l.name}</span> },
    {
      id: 'amount',
      header: 'Amount',
      numeric: true,
      cell: (l) => (l.amount ? <AmountDisplay amountMinor={l.amount.amountMinor} currency={l.amount.currency} size="sm" /> : 'Customer entered'),
    },
    { id: 'status', header: 'Status', cell: (l) => <StatusBadge status={l.status} /> },
    { id: 'successful', header: 'Successful payments', numeric: true, cell: (l) => l.successfulPaymentsCount, hideBelow: 'sm' },
    { id: 'usage', header: 'Type', cell: (l) => (l.reusable ? 'Reusable' : 'Single-use'), hideBelow: 'md' },
    { id: 'created', header: 'Created', cell: (l) => format(new Date(l.createdAt), 'd MMM yyyy'), hideBelow: 'md' },
    { id: 'expires', header: 'Expires', cell: (l) => (l.expiresAt ? format(new Date(l.expiresAt), 'd MMM yyyy') : 'Never'), hideBelow: 'lg' },
  ];

  return (
    <div>
      <PageHeader
        title="Payment links"
        description="Share a link or QR code to collect a payment without writing code."
        actions={
          canManage ? (
            <Button asChild>
              <Link to="/payment-links/create">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create payment link
              </Link>
            </Button>
          ) : undefined
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name" className="w-full max-w-sm" aria-label="Search payment links" />
      </FilterBar>

      {query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'We could not load payment links.'}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <DataTable
            caption="Payment links"
            columns={columns}
            data={query.data?.data ?? []}
            getRowKey={(l) => l.id}
            onRowClick={(l) => navigate(`/payment-links/${l.id}`)}
            loading={query.isPending}
            emptyTitle="No payment links yet"
            emptyDescription={canManage ? 'Create your first payment link to start collecting payments.' : 'Payment links will appear here once created.'}
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
