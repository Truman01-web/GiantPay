import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { usePermission, useSession } from '@/hooks/useSession';
import { formatMinorUnitsExact } from '@/lib/money';
import { toast } from '@/components/feedback/toastStore';
import { useSettlementActions, useSettlementDetail } from './useSettlementsQueries';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt><dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{value}</dd></div>;
}

export function SettlementDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useSettlementDetail(id);
  const actions = useSettlementActions(id);
  const session = useSession();
  const canManage = usePermission('settlements:manage');
  const canApprove = usePermission('settlements:approve');
  const [confirmation, setConfirmation] = useState<'submit' | 'cancel' | 'approve' | null>(null);
  const [cancelKey] = useState(() => crypto.randomUUID());
  if (query.isPending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-56" /></div>;
  if (query.isError || !query.data) return <ErrorState title="We couldn't load this settlement batch" message={query.error instanceof ApiError ? query.error.message : 'Please try again.'} onRetry={() => query.refetch()} />;
  const batch = query.data;
  const pending = actions.submit.isPending || actions.cancel.isPending || actions.approve.isPending || actions.exportBatch.isPending;
  const actionError = [actions.submit.error, actions.cancel.error, actions.approve.error, actions.exportBatch.error].find(Boolean);
  const canIndependentlyApprove = canApprove && Boolean(batch.createdBy) && batch.createdBy !== session?.user.id;

  async function confirmAction() {
    if (!confirmation || !id) return;
    try {
      if (confirmation === 'submit') await actions.submit.mutateAsync(id);
      if (confirmation === 'cancel') await actions.cancel.mutateAsync({ batchId: id, idempotencyKey: cancelKey });
      if (confirmation === 'approve') await actions.approve.mutateAsync(id);
      toast({ variant: 'success', title: confirmation === 'approve' ? 'Settlement approved' : confirmation === 'cancel' ? 'Settlement cancelled' : 'Settlement submitted' });
      setConfirmation(null);
    } catch { /* The normalized error remains visible below. */ }
  }

  async function exportCsv() {
    if (!id) return;
    try {
      const result = await actions.exportBatch.mutateAsync(id);
      const match = result.contentDisposition?.match(/filename="?([^";]+)"?/i);
      const safe = (match?.[1] ?? `giantpay-sandbox-settlement-${id}.csv`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url; link.download = safe; link.click();
      URL.revokeObjectURL(url);
      toast({ variant: 'success', title: 'Sandbox CSV exported' });
    } catch { /* Shown below. */ }
  }
  return (
    <div>
      <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: 'Settlement batches', to: '/settlements' }, { label: batch.id }]} />} title={batch.id} actions={<div className="flex flex-wrap items-center gap-2"><StatusBadge status={batch.status} />{canManage && batch.status === 'DRAFT' && <Button size="sm" onClick={() => setConfirmation('submit')}>Submit</Button>}{canManage && ['DRAFT','AWAITING_APPROVAL'].includes(batch.status) && <Button size="sm" variant="secondary" onClick={() => setConfirmation('cancel')}>Cancel</Button>}{batch.status === 'AWAITING_APPROVAL' && <Button size="sm" disabled={!canIndependentlyApprove} title={!batch.createdBy ? 'Creator identity is unavailable.' : batch.createdBy === session?.user.id ? 'Creators cannot approve their own batches.' : !canApprove ? 'settlements:approve permission is required.' : undefined} onClick={() => setConfirmation('approve')}>Approve</Button>}{canManage && ['APPROVED','EXPORTED'].includes(batch.status) && <Button size="sm" variant="secondary" loading={actions.exportBatch.isPending} onClick={() => void exportCsv()}>Export CSV</Button>}</div>} />
      <Alert variant="info">Sandbox accounting record only. No external bank or mobile-money transfer was executed.</Alert>
      {batch.status === 'AWAITING_APPROVAL' && !canIndependentlyApprove && <div className="mt-4"><Alert variant="warning">{!batch.createdBy ? 'Approval is disabled because creator identity is unavailable.' : batch.createdBy === session?.user.id ? 'A separate reviewer must approve this batch.' : 'You need settlements:approve permission to approve this batch.'}</Alert></div>}
      {actionError && <div className="mt-4"><Alert variant="danger">{actionError instanceof ApiError ? `${actionError.message}${actionError.requestId ? ` Reference: ${actionError.requestId}` : ''}` : 'The settlement action could not be completed.'}</Alert></div>}
      <Card className="mt-4"><CardContent>
        <p className="text-[length:var(--text-h1)] font-medium tabular-nums text-[var(--color-neutral-900)]">{formatMinorUnitsExact(batch.netMinor, batch.currency)}</p>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Period" value={`${format(new Date(batch.periodStart), 'd MMM yyyy')} – ${format(new Date(batch.periodEnd), 'd MMM yyyy')}`} />
          <Field label="Gross" value={formatMinorUnitsExact(batch.grossMinor, batch.currency)} />
          <Field label="Refunds" value={formatMinorUnitsExact(batch.refundsMinor, batch.currency)} />
          <Field label="Fees" value={formatMinorUnitsExact(batch.feesMinor, batch.currency)} />
          <Field label="Approved" value={batch.approvedAt ? format(new Date(batch.approvedAt), 'd MMM yyyy, HH:mm') : 'Not approved'} />
          <Field label="Exported" value={batch.exportedAt ? format(new Date(batch.exportedAt), 'd MMM yyyy, HH:mm') : 'Not exported'} />
          <Field label="External transfer" value={batch.externalTransferExecuted ? 'Executed' : 'Not executed'} />
        </dl>
      </CardContent></Card>
      <ConfirmationDialog open={Boolean(confirmation)} onOpenChange={(open) => !open && setConfirmation(null)} title={confirmation === 'approve' ? 'Approve sandbox settlement?' : confirmation === 'cancel' ? 'Cancel settlement?' : 'Submit settlement for approval?'} description={confirmation === 'approve' ? 'This records an internal sandbox approval only. It does not execute a transfer.' : confirmation === 'cancel' ? 'The cancelled accounting snapshot remains immutable.' : 'A different authorized reviewer must approve this batch.'} confirmLabel={confirmation === 'approve' ? 'Approve' : confirmation === 'cancel' ? 'Cancel batch' : 'Submit'} destructive={confirmation === 'cancel'} loading={pending} onConfirm={() => void confirmAction()} />
    </div>
  );
}
