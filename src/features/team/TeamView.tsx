import { useState, type FormEvent } from 'react';
import { MoreHorizontal, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/Dialog';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonTable } from '@/components/feedback/Skeleton';
import { toast } from '@/components/feedback/toastStore';
import { usePermission, useSession } from '@/hooks/useSession';
import type { TeamMember, TeamInvitation } from '@/services/api/team';
import { useInvitations, useMembers, useRoles, useTeamActions } from './useTeamQueries';

type ConfirmAction = { kind: 'cancel'; invitation: TeamInvitation } | { kind: 'suspend' | 'reactivate' | 'remove'; member: TeamMember };
const message = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';

export function TeamView() {
  const canManage = usePermission('team:manage');
  const session = useSession();
  const members = useMembers();
  const invitations = useInvitations();
  const roles = useRoles();
  const actions = useTeamActions();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [formError, setFormError] = useState<{ email?: string; role?: string; general?: string }>({});
  const [confirm, setConfirm] = useState<ConfirmAction>();

  const activeRoles = roles.data?.items.filter((role) => role.status === 'ACTIVE') ?? [];
  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setFormError({ email: 'Enter a valid email address.' });
    if (!roleId) return setFormError({ role: 'Select a role.' });
    try {
      await actions.invite.mutateAsync({ email, roleId });
      setEmail(''); setRoleId(''); setFormError({}); setInviteOpen(false);
      toast({ variant: 'success', title: 'Invitation created', description: 'Delivery is queued through the configured sandbox channel.' });
    } catch (error) { setFormError({ general: message(error) }); }
  }
  async function confirmAction() {
    if (!confirm) return;
    try {
      if (confirm.kind === 'cancel') await actions.cancel.mutateAsync(confirm.invitation.id);
      else await actions[confirm.kind].mutateAsync(confirm.member.id);
      const successTitle = confirm.kind === 'cancel' ? 'Invitation cancelled' : confirm.kind === 'suspend' ? 'Member suspended' : confirm.kind === 'reactivate' ? 'Member reactivated' : 'Member removed';
      toast({ variant: 'success', title: successTitle });
      setConfirm(undefined);
    } catch (error) { toast({ variant: 'error', title: 'Action failed', description: message(error) }); }
  }
  const pending = actions.cancel.isPending || actions.suspend.isPending || actions.reactivate.isPending || actions.remove.isPending;
  const failed = members.error ?? invitations.error ?? roles.error;
  if (failed) return <ErrorState message={message(failed)} onRetry={() => { void members.refetch(); void invitations.refetch(); void roles.refetch(); }} />;

  return <>
    <PageHeader title="Team" description="Manage members, invitations, and organization access." actions={canManage ? <Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" />Invite member</Button> : undefined} />
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        {members.isLoading || roles.isLoading ? <SkeletonTable rows={4} columns={4} /> : !members.data?.items.length ? <EmptyState icon={<Users />} title="No team members" /> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[var(--color-neutral-50)] text-[var(--color-neutral-600)]"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Security</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-[var(--color-neutral-200)]">
          {members.data.items.map((member) => <tr key={member.id}><td className="px-5 py-4"><p className="font-medium text-[var(--color-navy-900)]">{member.name}</p><p className="text-[var(--color-neutral-500)]">{member.email}</p></td><td className="min-w-48 px-5 py-4">{canManage && member.status !== 'REMOVED' && member.id !== session?.user.id ? <Select value={member.roleId} onValueChange={(next) => actions.changeRole.mutate({ id: member.id, roleId: next }, { onSuccess: () => toast({ variant: 'success', title: 'Role updated' }), onError: (error) => toast({ variant: 'error', title: 'Role update failed', description: message(error) }) })}><SelectTrigger aria-label={`Role for ${member.name}`}><SelectValue /></SelectTrigger><SelectContent>{activeRoles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select> : member.role}</td><td className="px-5 py-4"><Badge variant={member.status === 'ACTIVE' ? 'success' : member.status === 'SUSPENDED' ? 'warning' : 'neutral'}>{member.status}</Badge></td><td className="px-5 py-4">{member.mfaEnabled ? 'MFA enabled' : 'MFA not enabled'}</td><td className="px-5 py-4">{canManage && member.id !== session?.user.id && <div className="flex justify-end gap-2" aria-label={`Actions for ${member.name}`}>{member.status === 'ACTIVE' && <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'suspend', member })}>Suspend</Button>}{member.status === 'SUSPENDED' && <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'reactivate', member })}>Reactivate</Button>}{member.status !== 'REMOVED' && <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'remove', member })}>Remove</Button>}</div>}</td></tr>)}
        </tbody></table></div>}
      </Card>
      <Card><CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader>{invitations.isLoading ? <SkeletonTable rows={3} columns={3} /> : !invitations.data?.items.length ? <EmptyState title="No pending invitations" description="New invitations will appear here until accepted or cancelled." /> : <CardContent className="divide-y divide-[var(--color-neutral-200)] p-0">{invitations.data.items.map((invitation) => <div key={invitation.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{invitation.email}</p><p className="text-sm text-[var(--color-neutral-500)]">{invitation.role ?? activeRoles.find((role) => role.id === invitation.roleId)?.name} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>{canManage && <div className="flex gap-2"><Button size="sm" variant="secondary" loading={actions.resend.isPending} onClick={() => actions.resend.mutate(invitation.id, { onSuccess: () => toast({ variant: 'success', title: 'Invitation resent' }), onError: (error) => toast({ variant: 'error', title: 'Resend failed', description: message(error) }) })}>Resend</Button><Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'cancel', invitation })}>Cancel</Button></div>}</div>)}</CardContent>}</Card>
    </div>
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent title="Invite a team member" description="Assign access using an active organization role."><form className="space-y-4" onSubmit={invite}><FormField label="Email" required error={formError.email} children={(props) => <Input {...props} value={email} onChange={(event) => { setEmail(event.target.value); setFormError({}); }} type="email" autoComplete="email" />} /><FormField label="Role" required error={formError.role} children={(props) => <Select value={roleId} onValueChange={(value) => { setRoleId(value); setFormError({}); }}><SelectTrigger {...props}><SelectValue placeholder="Select a role" /></SelectTrigger><SelectContent>{activeRoles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select>} />{formError.general && <p role="alert" className="text-sm text-[var(--color-red-600)]">{formError.general}</p>}<div className="flex justify-end gap-2"><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" loading={actions.invite.isPending}>Send invitation</Button></div></form></DialogContent></Dialog>
    <ConfirmationDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(undefined)} title={confirm?.kind === 'cancel' ? 'Cancel invitation?' : `${confirm?.kind ?? 'Update'} member?`} description="This access change takes effect immediately. The final active owner cannot be suspended, removed, or demoted." confirmLabel="Confirm" destructive={confirm?.kind !== 'reactivate'} loading={pending} onConfirm={() => void confirmAction()}><MoreHorizontal className="sr-only" /></ConfirmationDialog>
  </>;
}
