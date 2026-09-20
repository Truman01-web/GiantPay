import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toastStore';
import { usePermission } from '@/hooks/useSession';
import type { SupportPriority, SupportStatus } from '@/services/api/support';
import { useSupportActions, useSupportAssignees, useSupportCase } from './useSupportQueries';

type ConsequentialAction = { status: SupportStatus; title: string; label: string };
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase());
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';

export function SupportDetailView({ platform = false }: { platform?: boolean }) {
  const { id = '' } = useParams();
  const query = useSupportCase(id, platform);
  const actions = useSupportActions(id, platform);
  const canWrite = usePermission(platform ? 'platform.support.reply' : 'support:write');
  const canAssign = usePermission('platform.support.assign');
  const canManage = usePermission('platform.support.manage');
  const assignees = useSupportAssignees(platform && canAssign);
  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState<ConsequentialAction>();
  const [staffId, setStaffId] = useState('');

  if (query.isLoading) return <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-72" /></div>;
  if (query.isError || !query.data) return <ErrorState title="Support case unavailable" message={query.isError ? errorMessage(query.error) : 'The support case was not found.'} onRetry={() => query.refetch()} />;
  const item = query.data;
  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      if (platform && internal) await actions.note.mutateAsync(message.trim());
      else await actions.reply.mutateAsync(message.trim());
      setMessage('');
      toast({ variant: 'success', title: internal ? 'Internal note added' : 'Reply added' });
    } catch (error) { toast({ variant: 'error', title: 'Message failed', description: errorMessage(error) }); }
  }
  async function changeStatus() {
    if (!confirmation || reason.trim().length < 3) return;
    try {
      await actions.status.mutateAsync({ status: confirmation.status, expectedStatus: item.status, reason: reason.trim() });
      toast({ variant: 'success', title: `${confirmation.label} complete` });
      setReason(''); setConfirmation(undefined);
    } catch (error) { toast({ variant: 'error', title: `${confirmation.label} failed`, description: errorMessage(error) }); }
  }
  const pending = actions.status.isPending;
  return <div className="space-y-6">
    <Link className="inline-flex items-center gap-2 text-sm text-[var(--color-blue-600)]" to={platform ? '/admin/support' : '/support'}><ArrowLeft className="h-4 w-4" />Back to support</Link>
    <PageHeader title={item.subject} description={item.reference} actions={<div className="flex flex-wrap gap-2"><Badge>{label(item.priority)}</Badge><Badge variant={item.status === 'ESCALATED' ? 'danger' : item.status === 'RESOLVED' || item.status === 'CLOSED' ? 'success' : 'blue'}>{label(item.status)}</Badge></div>} />
    {query.isFetching && <p role="status" className="text-sm text-[var(--color-neutral-500)]">Refreshing case…</p>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Case details</CardTitle></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm">{item.description}</p><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-[var(--color-neutral-500)]">Category</dt><dd>{label(item.category)}</dd></div><div><dt className="text-[var(--color-neutral-500)]">Created</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></div>{platform && item.merchant && <div><dt className="text-[var(--color-neutral-500)]">Merchant</dt><dd>{item.merchant.name}</dd></div>}<div><dt className="text-[var(--color-neutral-500)]">Assigned owner</dt><dd>{item.assignedOwner?.name ?? 'Unassigned'}</dd></div></dl></CardContent></Card>
        {item.linkedTransaction && <Card><CardHeader><CardTitle>Linked transaction</CardTitle></CardHeader><CardContent><dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-[var(--color-neutral-500)]">GiantPay reference</dt><dd>{item.linkedTransaction.reference}</dd></div><div><dt className="text-[var(--color-neutral-500)]">Merchant reference</dt><dd>{item.linkedTransaction.merchantReference ?? 'Not provided'}</dd></div><div><dt className="text-[var(--color-neutral-500)]">Current status</dt><dd>{label(item.linkedTransaction.status)}</dd></div></dl>{!platform && <Link className="mt-4 inline-block text-sm text-[var(--color-blue-600)]" to={`/transactions/${item.linkedTransaction.id}`}>View safe transaction timeline</Link>}</CardContent></Card>}
        <Card><CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader><CardContent>{item.timeline.length ? <ol className="space-y-4">{item.timeline.map((activity) => <li key={activity.id} className="relative border-l-2 border-[var(--color-neutral-200)] pl-4"><div className="flex flex-wrap items-center gap-2"><Badge variant={activity.visibility === 'INTERNAL' ? 'warning' : 'neutral'}>{activity.visibility === 'INTERNAL' ? 'Internal' : label(activity.type)}</Badge>{activity.from !== undefined && <span className="text-xs text-[var(--color-neutral-500)]">{activity.from ? label(activity.from) : 'Created'} → {activity.to ? label(activity.to) : ''}</span>}</div><p className="mt-2 whitespace-pre-wrap text-sm">{activity.body}</p><time className="mt-1 block text-xs text-[var(--color-neutral-500)]">{new Date(activity.createdAt).toLocaleString()}</time></li>)}</ol> : <p className="text-sm text-[var(--color-neutral-500)]">No activity has been recorded.</p>}</CardContent></Card>
        {canWrite && item.status !== 'CLOSED' && <Card><CardHeader><CardTitle>{platform ? 'Add response or note' : 'Reply'}</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={submitMessage}>{platform && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />Internal note (never visible to the merchant)</label>}<FormField label={internal ? 'Internal note' : 'Message'} required children={(props) => <Textarea {...props} value={message} maxLength={10000} onChange={(event) => setMessage(event.target.value)} />} /><Button type="submit" loading={actions.reply.isPending || actions.note.isPending} disabled={!message.trim()}>Add {internal ? 'note' : 'reply'}</Button></form></CardContent></Card>}
      </div>
      {platform && <aside className="space-y-4" aria-label="Case management">
        {canAssign && <Card><CardHeader><CardTitle>Assignment</CardTitle></CardHeader><CardContent className="space-y-3">{assignees.isError ? <ErrorState title="Assignees unavailable" message={errorMessage(assignees.error)} onRetry={() => assignees.refetch()} /> : <><FormField label="Authorized owner" children={(props) => <Select value={staffId} onValueChange={setStaffId} disabled={assignees.isLoading}><SelectTrigger {...props}><SelectValue placeholder={assignees.isLoading ? 'Loading authorized owners…' : 'Select an owner'} /></SelectTrigger><SelectContent>{assignees.data?.items.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}</SelectContent></Select>} /><Button variant="secondary" disabled={!staffId} loading={actions.assign.isPending} onClick={() => actions.assign.mutate({ staffId, expectedAssigneeId: item.assignedOwner?.id ?? null, reason: 'Assigned through support case management' }, { onSuccess: () => { setStaffId(''); toast({ variant: 'success', title: 'Case assigned' }); }, onError: (error) => toast({ variant: 'error', title: 'Assignment failed', description: errorMessage(error) }) })}>Assign owner</Button></>}</CardContent></Card>}
        {canManage && <Card><CardHeader><CardTitle>Case controls</CardTitle></CardHeader><CardContent className="space-y-4"><FormField label="Priority" children={(props) => <Select value={item.priority} onValueChange={(priority) => actions.priority.mutate({ priority: priority as SupportPriority, expectedPriority: item.priority, reason: 'Priority updated through support case management' }, { onSuccess: () => toast({ variant: 'success', title: 'Priority updated' }), onError: (error) => toast({ variant: 'error', title: 'Priority update failed', description: errorMessage(error) }) })}><SelectTrigger {...props}><SelectValue /></SelectTrigger><SelectContent>{(['LOW','NORMAL','HIGH','URGENT'] as SupportPriority[]).map((priority) => <SelectItem key={priority} value={priority}>{label(priority)}</SelectItem>)}</SelectContent></Select>} /><FormField label="Change status" children={(props) => <Select value={item.status} onValueChange={(status) => setConfirmation({ status: status as SupportStatus, title: `Change status to ${label(status)}?`, label: 'Update status' })}><SelectTrigger {...props}><SelectValue /></SelectTrigger><SelectContent>{(['OPEN','IN_PROGRESS','WAITING_ON_MERCHANT','WAITING_FOR_INTERNAL','ESCALATED','RESOLVED','CLOSED'] as SupportStatus[]).map((status) => <SelectItem key={status} value={status}>{label(status)}</SelectItem>)}</SelectContent></Select>} /><div className="flex flex-wrap gap-2">{item.status !== 'ESCALATED' && !['RESOLVED','CLOSED'].includes(item.status) && <Button size="sm" variant="secondary" onClick={() => setConfirmation({ status: 'ESCALATED', title: 'Escalate this case?', label: 'Escalation' })}>Escalate</Button>}{!['RESOLVED','CLOSED'].includes(item.status) && <Button size="sm" onClick={() => setConfirmation({ status: 'RESOLVED', title: 'Resolve this case?', label: 'Resolution' })}>Resolve</Button>}{item.status === 'RESOLVED' && <Button size="sm" variant="secondary" onClick={() => setConfirmation({ status: 'OPEN', title: 'Reopen this resolved case?', label: 'Reopen' })}>Reopen</Button>}{item.status !== 'CLOSED' && <Button size="sm" variant="ghost" onClick={() => setConfirmation({ status: 'CLOSED', title: 'Close this case?', label: 'Closure' })}>Close</Button>}</div></CardContent></Card>}
      </aside>}
    </div>
    <ConfirmationDialog open={Boolean(confirmation)} onOpenChange={(open) => !open && setConfirmation(undefined)} title={confirmation?.title ?? 'Confirm status change'} description={confirmation?.status === 'RESOLVED' ? 'A resolution note is required and will be retained in the case history.' : 'This consequential action is recorded in the audit trail.'} confirmLabel={confirmation?.label ?? 'Confirm'} destructive={confirmation?.status === 'CLOSED' || confirmation?.status === 'ESCALATED'} loading={pending} onConfirm={() => void changeStatus()}><div className="space-y-2"><label className="text-sm font-medium" htmlFor="support-action-reason">{confirmation?.status === 'RESOLVED' ? 'Resolution note' : 'Reason'}</label><Textarea id="support-action-reason" value={reason} onChange={(event) => setReason(event.target.value)} aria-describedby="support-action-help" /><p id="support-action-help" className="text-xs text-[var(--color-neutral-500)]">Enter at least 3 characters.</p></div></ConfirmationDialog>
    <ShieldAlert className="sr-only" /><MessageSquare className="sr-only" />
  </div>;
}
