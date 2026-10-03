import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { usePermission, useSession } from '@/hooks/useSession';
import type { ReconciliationException } from '@/types/reconciliation';
import { useAdjustmentActions } from './useReconciliationQueries';

export function AdjustmentDialog({ exception, onOpenChange }: { exception: ReconciliationException; onOpenChange: (open: boolean) => void }) {
  const session = useSession();
  const canManage = usePermission('reconciliation:manage');
  const canApprove = usePermission('reconciliation:approve');
  const actions = useAdjustmentActions();
  const [originalEntryId, setOriginalEntryId] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [validation, setValidation] = useState<string>();
  const latest = actions.latest;
  const error = [actions.propose.error, actions.approve.error, actions.reject.error].find(Boolean);
  const canReview = Boolean(latest && canApprove && latest.createdBy && latest.createdBy !== session?.user.id && latest.status === 'AWAITING_APPROVAL');

  async function propose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.submitted === 'true') return;
    if (originalEntryId.trim().length < 3 || reason.trim().length < 3 || evidenceRef.trim().length < 3) {
      setValidation('Ledger entry, reason, and evidence reference must each contain at least 3 characters.'); return;
    }
    form.dataset.submitted = 'true';
    try { await actions.propose.mutateAsync({ exceptionId: exception.id, originalEntryId: originalEntryId.trim(), reason: reason.trim(), evidenceRef: evidenceRef.trim(), idempotencyKey: key }); setKey(crypto.randomUUID()); }
    catch { delete form.dataset.submitted; }
  }

  async function decide(kind: 'approve' | 'reject') {
    if (!latest) return;
    setValidation(undefined);
    try {
      if (kind === 'approve') await actions.approve.mutateAsync(latest.id);
      else if (rejectReason.trim().length >= 3) await actions.reject.mutateAsync({ id: latest.id, reason: rejectReason.trim() });
      else setValidation('Add a rejection reason of at least 3 characters.');
    } catch { /* normalized below */ }
  }

  return <Dialog open onOpenChange={onOpenChange}><DialogContent title="Compensating adjustment" description={`Exception ${exception.id}`} className="max-h-[90vh] overflow-y-auto">
    <Alert variant="warning">An adjustment proposes an append-only ledger reversal. Dismissing an exception does not change financial records.</Alert>
    {(validation || error) && <div className="mt-4"><Alert variant="danger">{validation ?? (error instanceof ApiError ? `${error.message}${error.requestId ? ` Reference: ${error.requestId}` : ''}` : 'The adjustment action failed.')}</Alert></div>}
    {!latest ? <form className="mt-4 space-y-4" onSubmit={propose} noValidate>
      <FormField label="Original journal entry ID" required help="Use the server-issued journal entry identifier; payment IDs are not interchangeable.">{(props) => <Input {...props} value={originalEntryId} onChange={(event) => setOriginalEntryId(event.target.value)} />}</FormField>
      <FormField label="Reason" required>{(props) => <Textarea {...props} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />}</FormField>
      <FormField label="Evidence reference" required help="Opaque internal case or evidence reference only.">{(props) => <Input {...props} value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} />}</FormField>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Close</Button><Button type="submit" disabled={!canManage} loading={actions.propose.isPending}>Request adjustment</Button></div>
    </form> : <div className="mt-4 space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-[var(--color-neutral-500)]">Adjustment</dt><dd className="break-all">{latest.id}</dd></div><div><dt className="text-sm text-[var(--color-neutral-500)]">Status</dt><dd>{latest.status}</dd></div><div><dt className="text-sm text-[var(--color-neutral-500)]">Evidence</dt><dd className="break-all">{latest.evidenceRef}</dd></div><div><dt className="text-sm text-[var(--color-neutral-500)]">Ledger effect</dt><dd>{latest.journalEntryId ?? 'None posted'}</dd></div></dl>
      {latest.status === 'AWAITING_APPROVAL' && <>{!canReview && <Alert variant="info">{!latest.createdBy ? 'Review is disabled because requester identity is unavailable.' : latest.createdBy === session?.user.id ? 'A separate reviewer must approve or reject this request.' : 'reconciliation:approve permission is required.'}</Alert>}<FormField label="Rejection reason" optional>{(props) => <Textarea {...props} rows={2} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />}</FormField><div className="flex justify-end gap-2"><Button variant="secondary" disabled={!canReview} loading={actions.reject.isPending} onClick={() => void decide('reject')}>Reject</Button><Button disabled={!canReview} loading={actions.approve.isPending} onClick={() => void decide('approve')}>Approve adjustment</Button></div></>}
      <Alert variant="info">The API does not expose an adjustment list or history route. This status is the backend response for this session and is not reconstructed after reload.</Alert>
    </div>}
  </DialogContent></Dialog>;
}
