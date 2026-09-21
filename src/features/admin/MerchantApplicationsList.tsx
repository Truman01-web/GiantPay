import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useComplianceApplications } from './useAdminQueries';
import type { ComplianceApplication } from '@/services/api/admin';

const RISK_COLORS: Record<NonNullable<ComplianceApplication['riskLevel']>, string> = {
  LOW: 'text-[var(--color-green-700)] bg-[var(--color-green-50)] border-[var(--color-green-200)]',
  MEDIUM: 'text-[var(--color-amber-700)] bg-[var(--color-amber-50)] border-[var(--color-amber-200)]',
  HIGH: 'text-[var(--color-red-700)] bg-[var(--color-red-50)] border-[var(--color-red-200)]',
  PROHIBITED: 'text-[var(--color-red-900)] bg-[var(--color-red-100)] border-[var(--color-red-300)]',
};

function RiskBadge({ riskLevel }: { riskLevel: ComplianceApplication['riskLevel'] }) {
  if (!riskLevel) return <span className="text-[var(--color-neutral-400)]">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[length:var(--text-label)] font-medium ${RISK_COLORS[riskLevel]}`}
    >
      {riskLevel}
    </span>
  );
}

export function MerchantApplicationsList() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const query = useComplianceApplications({ page, pageSize: 20 });

  const columns: DataTableColumn<ComplianceApplication>[] = [
    {
      id: 'business',
      header: 'Business',
      cell: (a) => <span className="font-medium text-[var(--color-navy-950)]">{a.businessName}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (a) => <StatusBadge status={a.status} />,
    },
    {
      id: 'risk',
      header: 'Risk level',
      cell: (a) => <RiskBadge riskLevel={a.riskLevel} />,
      hideBelow: 'sm' as const,
    },
    {
      id: 'type',
      header: 'Business type',
      cell: (a) => a.businessType ?? '—',
      hideBelow: 'md' as const,
    },
    {
      id: 'submitted',
      header: 'Submitted',
      cell: (a) => format(new Date(a.submittedAt), 'd MMM yyyy'),
      hideBelow: 'sm' as const,
    },
    {
      id: 'reviewer',
      header: 'Reviewer',
      cell: (a) => a.reviewedBy ?? <span className="text-[var(--color-neutral-400)]">Unassigned</span>,
      hideBelow: 'lg' as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Merchant Applications"
        description="KYB/KYC compliance applications submitted by merchants awaiting review, approval, or rejection."
      />

      {query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'We could not load applications.'}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <DataTable
            caption="Compliance applications"
            columns={columns}
            data={query.data?.items ?? []}
            getRowKey={(a) => a.id}
            onRowClick={(a) => navigate(`/admin/merchant-applications/${a.id}`)}
            loading={query.isPending}
            emptyTitle="No applications yet"
            emptyDescription="Submitted merchant KYB applications will appear here for review."
          />
          {query.data && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination
                page={page}
                pageSize={20}
                total={query.data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
