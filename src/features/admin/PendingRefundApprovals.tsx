import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Pagination } from '@/components/data-display/Pagination';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert } from '@/components/feedback/Alert';
import { FormField } from '@/components/forms/FormField';
import { Textarea } from '@/components/ui/Textarea';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { toast } from '@/components/feedback/toastStore';
import { ApiError } from '@/services/api/errors';
import { usePendingRefunds, useDecideRefund } from './useAdminQueries';
import type { PendingRefund } from '@/services/api/admin';

type Decision = 'APPROVE' | 'REJECT';

function DecideDialog({
  refund,
  decision,
  onClose,
}: {
  refund: PendingRefund;
  decision: Decision;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useDecideRefund();

  const isApprove = decision === 'APPROVE';

  async function handle() {
    setError(null);
    try {
      await decide.mutateAsync({ id: refund.id, decision, note });
      toast({
        variant: 'success',
        title: isApprove ? 'Refund approved' : 'Refund rejected',
        description: `${refund.customerName}'s refund has been ${isApprove ? 'approved and queued for processing' : 'rejected'}.`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${isApprove ? 'approve' : 'reject'} refund.`);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={isApprove ? 'Approve Refund' : 'Reject Refund'}
        description={`${refund.customerName} — ${refund.paymentReference}`}
      >
        {error && (
          <div className="mb-4">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">Refund amount</span>
            <AmountDisplay amountMinor={refund.amountMinor} currency={refund.currency} className="font-semibold" />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">Reason</span>
            <span className="text-[length:var(--text-label)] text-[var(--color-neutral-800)]">{refund.reason}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">Requested by</span>
            <span className="text-[length:var(--text-label)] text-[var(--color-neutral-800)]">{refund.requestedBy.name}</span>
          </div>
        </div>

        {!isApprove && (
          <Alert variant="warning" className="mb-4">
            Rejecting this refund is irreversible. The merchant will be notified and the request will be closed.
          </Alert>
        )}

        <FormField label={isApprove ? 'Approval note (optional)' : 'Rejection reason'} required={!isApprove}>
          {(fp) => (
            <Textarea
              {...fp}
              rows={3}
              placeholder={
                isApprove
                  ? 'Approved — within refund policy limits...'
                  : 'Refund exceeds the allowable window per merchant agreement...'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </FormField>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'primary' : 'destructive'}
            onClick={handle}
            loading={decide.isPending}
            disabled={!isApprove && !note.trim()}
          >
            {isApprove ? (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Confirm approval
              </>
            ) : (
              <>
                <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Confirm rejection
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PendingRefundApprovals() {
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ refund: PendingRefund; decision: Decision } | null>(null);

  const query = usePendingRefunds({ page, pageSize: 20 });

  const columns: DataTableColumn<PendingRefund>[] = [
    {
      id: 'customer',
      header: 'Customer',
      cell: (r) => <span className="font-medium text-[var(--color-navy-950)]">{r.customerName}</span>,
    },
    {
      id: 'reference',
      header: 'Payment ref',
      cell: (r) => (
        <span className="font-mono text-[length:var(--text-label)] text-[var(--color-neutral-700)]">
          {r.paymentReference}
        </span>
      ),
      hideBelow: 'sm' as const,
    },
    {
      id: 'amount',
      header: 'Amount',
      numeric: true,
      cell: (r) => <AmountDisplay amountMinor={r.amountMinor} currency={r.currency} />,
    },
    {
      id: 'reason',
      header: 'Reason',
      cell: (r) => (
        <span className="max-w-[18rem] truncate text-[var(--color-neutral-700)]">{r.reason}</span>
      ),
      hideBelow: 'md' as const,
    },
    {
      id: 'requestedBy',
      header: 'Requested by',
      cell: (r) => r.requestedBy.name,
      hideBelow: 'lg' as const,
    },
    {
      id: 'createdAt',
      header: 'Submitted',
      cell: (r) => format(new Date(r.createdAt), 'd MMM yyyy, HH:mm'),
      hideBelow: 'sm' as const,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--color-green-600)] text-[var(--color-green-700)] hover:bg-[var(--color-green-50)]"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ refund: r, decision: 'APPROVE' });
            }}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setPending({ refund: r, decision: 'REJECT' });
            }}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Refund Approvals"
        description="Maker-checker sign-off queue for merchant refund requests. Each decision is recorded and irreversible."
      />

      {query.isError ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'We could not load pending refunds.'}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <DataTable
            caption="Pending refund approvals"
            columns={columns}
            data={query.data?.items ?? []}
            getRowKey={(r) => r.id}
            loading={query.isPending}
            emptyTitle="No pending refunds"
            emptyDescription="All refund requests have been processed. New requests will appear here."
          />
          {query.data && (
            <div className="rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white">
              <Pagination page={page} pageSize={20} total={query.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {pending && (
        <DecideDialog
          refund={pending.refund}
          decision={pending.decision}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}
