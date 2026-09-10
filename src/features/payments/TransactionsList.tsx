import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { SearchInput } from '@/components/forms/SearchInput';
import { FilterBar } from '@/components/forms/FilterBar';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { MobileDataList } from '@/components/data-display/MobileDataList';
import { Pagination } from '@/components/data-display/Pagination';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { usePaymentsList } from './usePaymentsQueries';
import type { PaymentListItem, PaymentStatus, PaymentChannel } from '@/types/payments';
import { format } from 'date-fns';

const STATUS_OPTIONS: PaymentStatus[] = ['SUCCEEDED', 'PENDING', 'PROCESSING', 'FAILED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED'];
const CHANNEL_OPTIONS: Array<{ value: PaymentChannel; label: string }> = [
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
];

function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = 20;
  const search = searchParams.get('search') ?? '';
  const status = (searchParams.get('status')?.split(',').filter(Boolean) ?? []) as PaymentStatus[];
  const channel = (searchParams.get('channel')?.split(',').filter(Boolean) ?? []) as PaymentChannel[];

  function update(next: Partial<{ page: number; search: string; status: PaymentStatus[]; channel: PaymentChannel[] }>) {
    const merged = { page, search, status, channel, ...next };
    const params = new URLSearchParams();
    if (merged.page > 1) params.set('page', String(merged.page));
    if (merged.search) params.set('search', merged.search);
    if (merged.status.length) params.set('status', merged.status.join(','));
    if (merged.channel.length) params.set('channel', merged.channel.join(','));
    setSearchParams(params, { replace: true });
  }

  return { page, pageSize, search, status, channel, update };
}

export function TransactionsList() {
  const { page, pageSize, search, status, channel, update } = useListParams();
  const navigate = useNavigate();

  const query = usePaymentsList({ page, pageSize, search: search || undefined, status, channel, sort: '-createdAt' });

  const columns: DataTableColumn<PaymentListItem>[] = [
    { id: 'reference', header: 'Reference', cell: (r) => <span className="font-medium tabular-nums">{r.reference}</span> },
    { id: 'merchantRef', header: 'Merchant ref.', cell: (r) => r.merchantReference ?? '—', hideBelow: 'md' },
    { id: 'customer', header: 'Customer', cell: (r) => r.customerName ?? 'Unknown', hideBelow: 'sm' },
    { id: 'amount', header: 'Amount', numeric: true, cell: (r) => <AmountDisplay amountMinor={r.amount.amountMinor} currency={r.amount.currency} size="sm" /> },
    { id: 'channel', header: 'Channel', cell: (r) => CHANNEL_OPTIONS.find((c) => c.value === r.channel)?.label ?? r.channel, hideBelow: 'lg' },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { id: 'created', header: 'Created', cell: (r) => format(new Date(r.createdAt), 'd MMM yyyy, HH:mm'), hideBelow: 'md' },
  ];

  return (
    <div>
      <PageHeader title="Transactions" description="Search and review every payment attempt." />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => update({ search: v, page: 1 })}
          placeholder="Search by reference, customer or merchant reference"
          className="w-full max-w-sm"
          aria-label="Search transactions"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Status {status.length > 0 && `(${status.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={status.includes(s)}
                onCheckedChange={(checked) => update({ status: checked ? [...status, s] : status.filter((x) => x !== s), page: 1 })}
                onSelect={(e) => e.preventDefault()}
              >
                {s.replace(/_/g, ' ')}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              <Filter className="h-4 w-4" aria-hidden="true" />
              Channel {channel.length > 0 && `(${channel.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by channel</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CHANNEL_OPTIONS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.value}
                checked={channel.includes(c.value)}
                onCheckedChange={(checked) => update({ channel: checked ? [...channel, c.value] : channel.filter((x) => x !== c.value), page: 1 })}
                onSelect={(e) => e.preventDefault()}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </FilterBar>

      {query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'We could not load transactions.'}
          requestId={query.error instanceof ApiError ? query.error.requestId : undefined}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <div className="hidden sm:block">
            <DataTable
              caption="Transactions"
              columns={columns}
              data={query.data?.data ?? []}
              getRowKey={(r) => r.id}
              onRowClick={(r) => navigate(`/transactions/${r.id}`)}
              loading={query.isPending}
              emptyTitle="No transactions match your filters"
              emptyDescription="Try adjusting or clearing your search and filters."
            />
          </div>
          <div className="sm:hidden">
            <MobileDataList
              data={query.data?.data ?? []}
              getRowKey={(r) => r.id}
              onItemClick={(r) => navigate(`/transactions/${r.id}`)}
              renderItem={(r) => ({
                title: r.reference,
                subtitle: r.customerName ?? 'Unknown customer',
                trailing: <AmountDisplay amountMinor={r.amount.amountMinor} currency={r.amount.currency} size="sm" />,
                meta: <StatusBadge status={r.status} />,
              })}
            />
          </div>

          {query.data && (
            <div className="mt-2 rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white sm:border-t-0">
              <Pagination page={page} pageSize={pageSize} total={query.data.total} onPageChange={(p) => update({ page: p })} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
