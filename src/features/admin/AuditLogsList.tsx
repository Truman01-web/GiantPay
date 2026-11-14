import { useState } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useAuditEvents } from './useAdminQueries';
import type { AuditEvent } from '@/services/api/admin';

export function AuditLogsList() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const query = useAuditEvents({
    page,
    pageSize: 25,
    action: actionFilter || undefined,
    resourceType: resourceFilter || undefined,
  });

  function handleFilterChange() {
    setPage(1);
  }

  const columns: DataTableColumn<AuditEvent>[] = [
    {
      id: 'actor',
      header: 'Actor',
      cell: (e) => (
        <div>
          <p className="font-medium text-[var(--color-neutral-900)]">{e.actorEmail ?? e.actorId}</p>
          {e.ipAddress && (
            <p className="text-[length:var(--text-help)] font-mono text-[var(--color-neutral-500)]">{e.ipAddress}</p>
          )}
        </div>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (e) => (
        <span className="font-mono text-[length:var(--text-label)] text-[var(--color-navy-800)]">
          {e.action}
        </span>
      ),
    },
    {
      id: 'resource',
      header: 'Resource',
      cell: (e) => (
        <div>
          <span className="text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">
            {e.resourceType}
          </span>
          {e.resourceId && (
            <p className="text-[length:var(--text-help)] font-mono text-[var(--color-neutral-500)] truncate max-w-[10rem]">
              {e.resourceId}
            </p>
          )}
        </div>
      ),
      hideBelow: 'sm' as const,
    },
    {
      id: 'merchant',
      header: 'Merchant ID',
      cell: (e) => (
        <span className="font-mono text-[length:var(--text-help)] text-[var(--color-neutral-600)]">
          {e.merchantId ?? '—'}
        </span>
      ),
      hideBelow: 'lg' as const,
    },
    {
      id: 'timestamp',
      header: 'Timestamp',
      cell: (e) => (
        <span className="whitespace-nowrap text-[length:var(--text-label)] text-[var(--color-neutral-600)]">
          {format(new Date(e.createdAt), 'd MMM yyyy, HH:mm:ss')}
        </span>
      ),
      hideBelow: 'sm' as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all platform actions. Filtered by actor, action type, or resource."
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          id="audit-action-filter"
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            handleFilterChange();
          }}
          className="sm:max-w-xs"
          aria-label="Filter audit logs by action"
        />
        <Input
          id="audit-resource-filter"
          placeholder="Filter by resource type…"
          value={resourceFilter}
          onChange={(e) => {
            setResourceFilter(e.target.value);
            handleFilterChange();
          }}
          className="sm:max-w-xs"
          aria-label="Filter audit logs by resource type"
        />
      </div>

      {query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'We could not load audit events.'}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <DataTable
            caption="Audit log events"
            columns={columns}
            data={query.data?.items ?? []}
            getRowKey={(e) => e.id}
            loading={query.isPending}
            emptyTitle="No audit events"
            emptyDescription="Audit events will appear here as actions are performed on the platform."
          />
          {query.data && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination page={page} pageSize={25} total={query.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
