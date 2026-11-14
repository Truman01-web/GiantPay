import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/Dialog';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonTable } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toastStore';
import { usePermission } from '@/hooks/useSession';
import type { MerchantRole } from '@/services/api/team';
import type { Permission } from '@/types/auth';
import { useRoleActions, useRoles } from './useTeamQueries';

const AVAILABLE_PERMISSIONS: Permission[] = ['payments:read','payments.links:manage','payments.refunds:request','payments.refunds:approve','settlements:read','settlements:manage','settlements:approve','reconciliation:read','reconciliation:manage','reconciliation:approve','ledger:read','ledger:integrity','reports:read','reports:export','audit:read','developer.apiKeys:manage','developer.webhooks:manage','team:read','team:manage','roles:read','roles:manage','sessions:read','sessions:manage','security:manage:self','onboarding:read','onboarding:write','onboarding:submit','compliance:read','compliance:review','compliance:approve'];
const message = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';

export function RolesView() {
  const canManage = usePermission('roles:manage');
  const query = useRoles();
  const actions = useRoleActions();
  const [editing, setEditing] = useState<MerchantRole | null | undefined>();
  const [archiving, setArchiving] = useState<MerchantRole>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  function openEditor(role: MerchantRole | null) {
    setName(role?.name ?? ''); setDescription(role?.description ?? ''); setPermissions(role?.permissions ?? []); setError(undefined); setEditing(role);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return setError('Role name must contain at least two characters.');
    if (!permissions.length) return setError('Select at least one permission.');
    try {
      if (editing) await actions.update.mutateAsync({ id: editing.id, data: { name: name.trim(), description: description.trim(), permissions } });
      else await actions.create.mutateAsync({ name: name.trim(), description: description.trim(), permissions });
      toast({ variant: 'success', title: editing ? 'Role updated' : 'Role created' }); setEditing(undefined);
    } catch (caught) { setError(message(caught)); }
  }
  async function archive() {
    if (!archiving) return;
    try { await actions.archive.mutateAsync(archiving.id); toast({ variant: 'success', title: 'Role archived' }); setArchiving(undefined); }
    catch (caught) { toast({ variant: 'error', title: 'Archive failed', description: message(caught) }); }
  }
  if (query.error) return <ErrorState message={message(query.error)} onRetry={() => void query.refetch()} />;
  const roles = query.data?.items ?? [];
  return <>
    <PageHeader title="Roles & permissions" description="Create reusable access profiles for your organization." actions={canManage ? <Button onClick={() => openEditor(null)}>Create role</Button> : undefined} />
    <Card>{query.isLoading ? <SkeletonTable rows={5} columns={3} /> : !roles.length ? <EmptyState icon={<ShieldCheck />} title="No roles configured" action={canManage ? { label: 'Create role', onClick: () => openEditor(null) } : undefined} /> : <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <article key={role.id} className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-[var(--color-navy-900)]">{role.name}</h2><p className="mt-1 text-sm text-[var(--color-neutral-600)]">{role.description || 'No description'}</p></div><Badge variant={role.status === 'ACTIVE' ? role.systemRole ? 'blue' : 'success' : 'neutral'}>{role.systemRole ? 'System' : role.status}</Badge></div><p className="mt-4 text-sm font-medium">{role.permissions.length} permissions{role.memberCount !== undefined ? ` · ${role.memberCount} members` : ''}</p><div className="mt-2 flex flex-wrap gap-1">{role.permissions.slice(0, 4).map((permission) => <Badge key={permission}>{permission}</Badge>)}{role.permissions.length > 4 && <Badge>+{role.permissions.length - 4}</Badge>}</div>{canManage && !role.systemRole && role.status === 'ACTIVE' && <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" onClick={() => openEditor(role)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => setArchiving(role)}>Archive</Button></div>}</article>)}</CardContent>}</Card>
    <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}><DialogContent className="max-h-[90vh] overflow-y-auto" title={editing ? 'Edit custom role' : 'Create custom role'} description="Permissions determine which organization resources members can access."><form className="space-y-4" onSubmit={submit}><FormField label="Name" required error={error} children={(props) => <Input {...props} value={name} onChange={(event) => { setName(event.target.value); setError(undefined); }} />} /><FormField label="Description" optional children={(props) => <Textarea {...props} value={description} onChange={(event) => setDescription(event.target.value)} />} /><fieldset><legend className="text-sm font-medium text-[var(--color-neutral-700)]">Permissions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{AVAILABLE_PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-2 rounded border border-[var(--color-neutral-200)] p-2 text-sm"><Checkbox checked={permissions.includes(permission)} onCheckedChange={(checked) => setPermissions((current) => checked ? [...current, permission] : current.filter((item) => item !== permission))} /><span className="break-all">{permission}</span></label>)}</div></fieldset><div className="flex justify-end gap-2"><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" loading={actions.create.isPending || actions.update.isPending}>{editing ? 'Save changes' : 'Create role'}</Button></div></form></DialogContent></Dialog>
    <ConfirmationDialog open={Boolean(archiving)} onOpenChange={(open) => !open && setArchiving(undefined)} title="Archive role?" description="Archived roles cannot be assigned. Roles currently assigned to members cannot be archived." confirmLabel="Archive role" destructive loading={actions.archive.isPending} onConfirm={() => void archive()} />
  </>;
}
