import { useDeferredValue, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/navigation/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ErrorState } from '@/components/feedback/ErrorState';
import { toast } from '@/components/feedback/toastStore';
import { usePermission } from '@/hooks/useSession';
import { usePaymentsList } from '@/features/payments/usePaymentsQueries';
import type { SupportCase, SupportCategory, SupportPriority, SupportStatus } from '@/services/api/support';
import { useCreateSupportCase, useSupportAssignees, useSupportCases } from './useSupportQueries';

const statuses: SupportStatus[] = ['OPEN','IN_PROGRESS','WAITING_ON_MERCHANT','WAITING_FOR_INTERNAL','ESCALATED','RESOLVED','CLOSED'];
const priorities: SupportPriority[] = ['LOW','NORMAL','HIGH','URGENT'];
const categories: SupportCategory[] = ['ACCOUNT','ONBOARDING','PAYMENT','REFUND','SETTLEMENT','RECONCILIATION','API_INTEGRATION','WEBHOOK','SECURITY','OTHER'];
const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase());
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';

function statusVariant(status: SupportStatus): 'neutral' | 'blue' | 'success' | 'warning' | 'danger' {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success';
  if (status === 'ESCALATED') return 'danger';
  if (status.startsWith('WAITING')) return 'warning';
  return status === 'IN_PROGRESS' ? 'blue' : 'neutral';
}

export function SupportListView({ platform = false }: { platform?: boolean }) {
  const navigate = useNavigate();
  const canCreate = usePermission('support:write') && !platform;
  const canFilterOwners = usePermission('platform.support.assign');
  const assignees = useSupportAssignees(platform && canFilterOwners);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [assignedTo, setAssignedTo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<'updatedAt' | 'createdAt'>('updatedAt');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const page = cursors.length;
  const params = { limit: 20, cursor: cursors.at(-1), search: deferredSearch || undefined, status: status === 'all' ? undefined : status as SupportStatus, priority: priority === 'all' ? undefined : priority as SupportPriority, assignedTo: platform && assignedTo.trim() ? assignedTo.trim() : undefined, from: from ? new Date(`${from}T00:00:00Z`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined, sort, direction };
  const query = useSupportCases(params, platform);
  const [createOpen, setCreateOpen] = useState(false);
  const resetPage = () => setCursors([undefined]);
  const columns: DataTableColumn<SupportCase>[] = [
    { id: 'reference', header: 'Case', cell: (item) => <div><span className="font-medium tabular-nums">{item.reference}</span><p className="max-w-64 truncate text-xs text-[var(--color-neutral-500)]">{item.subject}</p></div> },
    { id: 'transaction', header: 'Transaction', cell: (item) => item.linkedTransaction?.reference ?? 'None', hideBelow: 'lg' },
    { id: 'status', header: 'Status', cell: (item) => <Badge variant={statusVariant(item.status)}>{label(item.status)}</Badge> },
    { id: 'priority', header: 'Priority', cell: (item) => <Badge variant={item.priority === 'URGENT' ? 'danger' : item.priority === 'HIGH' ? 'warning' : 'neutral'}>{label(item.priority)}</Badge>, hideBelow: 'sm' },
    { id: 'owner', header: 'Owner', cell: (item) => item.assignedOwner?.name ?? 'Unassigned', hideBelow: 'md' },
    { id: 'updated', header: 'Last update', cell: (item) => new Date(item.updatedAt).toLocaleString(), hideBelow: 'md' },
  ];

  return <div>
    <PageHeader title={platform ? 'Support cases' : 'Support'} description={platform ? 'Investigate and manage authorized merchant support cases.' : 'Create and track support cases for your organization.'} actions={canCreate ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create case</Button> : undefined} />
    <section aria-label="Support case filters" className="mb-4 grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label="Search" children={(props) => <Input {...props} value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Case or transaction reference" />} />
      <FormField label="Status" children={(props) => <Select value={status} onValueChange={(value) => { setStatus(value); resetPage(); }}><SelectTrigger {...props}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent></Select>} />
      <FormField label="Priority" children={(props) => <Select value={priority} onValueChange={(value) => { setPriority(value); resetPage(); }}><SelectTrigger {...props}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All priorities</SelectItem>{priorities.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent></Select>} />
      <FormField label="Sort" children={(props) => <Select value={`${sort}-${direction}`} onValueChange={(value) => { const [field, order] = value.split('-') as [typeof sort, typeof direction]; setSort(field); setDirection(order); resetPage(); }}><SelectTrigger {...props}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="updatedAt-desc">Recently updated</SelectItem><SelectItem value="updatedAt-asc">Least recently updated</SelectItem><SelectItem value="createdAt-desc">Newest created</SelectItem><SelectItem value="createdAt-asc">Oldest created</SelectItem></SelectContent></Select>} />
      <FormField label="Created from" optional children={(props) => <Input {...props} type="date" value={from} onChange={(event) => { setFrom(event.target.value); resetPage(); }} />} />
      <FormField label="Created to" optional children={(props) => <Input {...props} type="date" value={to} onChange={(event) => { setTo(event.target.value); resetPage(); }} />} />
      {platform && canFilterOwners && <FormField label="Assigned owner" optional children={(props) => <Select value={assignedTo || 'all'} onValueChange={(value) => { setAssignedTo(value === 'all' ? '' : value); resetPage(); }} disabled={assignees.isLoading}><SelectTrigger {...props}><SelectValue placeholder="All owners" /></SelectTrigger><SelectContent><SelectItem value="all">All owners</SelectItem>{assignees.data?.items.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}</SelectContent></Select>} />}
      {query.isFetching && !query.isLoading && <p className="self-end pb-2 text-sm text-[var(--color-neutral-500)]" role="status">Refreshing cases…</p>}
    </section>
    {query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : <>
      <DataTable caption="Support cases" columns={columns} data={query.data?.data ?? []} getRowKey={(item) => item.id} onRowClick={(item) => navigate(platform ? `/admin/support/${item.id}` : `/support/${item.id}`)} loading={query.isLoading} emptyTitle="No support cases" emptyDescription="No cases match the current filters." />
      <div className="flex items-center justify-between rounded-b-[var(--radius-md)] border border-t-0 border-[var(--color-neutral-200)] bg-white px-4 py-3"><p className="text-sm text-[var(--color-neutral-600)]" aria-live="polite">Page {page}{query.data ? ` · ${query.data.total} matching cases` : ''}</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setCursors((current) => current.slice(0, -1))}>Previous</Button><Button size="sm" variant="secondary" disabled={!query.data?.nextCursor} onClick={() => query.data?.nextCursor && setCursors((current) => [...current, query.data!.nextCursor!])}>Next</Button></div></div>
    </>}
    <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} />
  </div>;
}

function CreateCaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const mutation = useCreateSupportCase();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportCategory>('OTHER');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionId, setTransactionId] = useState<string>();
  const [validation, setValidation] = useState<string>();
  const transactions = usePaymentsList({ page: 1, pageSize: 10, search: transactionSearch || undefined });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (subject.trim().length < 3) return setValidation('Subject must contain at least 3 characters.');
    if (!description.trim()) return setValidation('Description is required.');
    try {
      const created = await mutation.mutateAsync({ subject: subject.trim(), category, message: description.trim(), transactionId });
      toast({ variant: 'success', title: 'Support case created', description: created.reference });
      onOpenChange(false);
      navigate(`/support/${created.id}`);
    } catch (error) { setValidation(errorMessage(error)); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent title="Create support case" description="Do not include passwords, OTPs, complete payment credentials, or other secrets."><form className="space-y-4" onSubmit={submit}>
    <FormField label="Subject" required error={validation} children={(props) => <Input {...props} value={subject} maxLength={160} onChange={(event) => { setSubject(event.target.value); setValidation(undefined); }} />} />
    <FormField label="Category" required children={(props) => <Select value={category} onValueChange={(value) => setCategory(value as SupportCategory)}><SelectTrigger {...props}><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{label(item)}</SelectItem>)}</SelectContent></Select>} />
    <FormField label="Description" required children={(props) => <Textarea {...props} rows={5} value={description} maxLength={10000} onChange={(event) => { setDescription(event.target.value); setValidation(undefined); }} />} />
    <FormField label="Link transaction" optional children={(props) => <Input {...props} value={transactionSearch} onChange={(event) => { setTransactionSearch(event.target.value); setTransactionId(undefined); }} placeholder="Search reference or customer" />} />
    {transactionSearch && <div className="max-h-40 overflow-y-auto rounded border border-[var(--color-neutral-200)]" aria-label="Transaction search results">{transactions.isLoading ? <p className="p-3 text-sm">Searching…</p> : transactions.data?.data.length ? transactions.data.data.map((item) => <button className={`block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-neutral-50)] ${transactionId === item.id ? 'bg-[var(--color-blue-50)]' : ''}`} key={item.id} type="button" onClick={() => { setTransactionId(item.id); setTransactionSearch(item.reference); }}>{item.reference}{item.merchantReference ? ` · ${item.merchantReference}` : ''}</button>) : <p className="p-3 text-sm">No matching transactions.</p>}</div>}
    <div className="flex justify-end gap-2"><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" loading={mutation.isPending} disabled={mutation.isPending}>Create case</Button></div>
  </form></DialogContent></Dialog>;
}
