import { useState } from 'react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  X,
  Search,
  Lock,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Finance' | 'Support';
  status: 'Active' | 'Pending Invite';
  twoFactorEnabled: boolean;
  lastActive: string;
}

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 'usr_1',
    name: 'Chikondi Banda',
    email: 'chikondi.banda@kambazapay.mw',
    role: 'Owner',
    status: 'Active',
    twoFactorEnabled: true,
    lastActive: 'Just now',
  },
  {
    id: 'usr_2',
    name: 'Taonga Phiri',
    email: 'taonga.phiri@kambazapay.mw',
    role: 'Admin',
    status: 'Active',
    twoFactorEnabled: true,
    lastActive: '2 hours ago',
  },
  {
    id: 'usr_3',
    name: 'Madalitso Chirwa',
    email: 'm.chirwa@kambazapay.mw',
    role: 'Developer',
    status: 'Active',
    twoFactorEnabled: false,
    lastActive: 'Yesterday',
  },
  {
    id: 'usr_4',
    name: 'Grace Mwale',
    email: 'grace.mwale@kambazapay.mw',
    role: 'Finance',
    status: 'Pending Invite',
    twoFactorEnabled: false,
    lastActive: 'Never',
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [search, setSearch] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Developer' | 'Finance' | 'Support'>('Developer');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: TeamMember = {
      id: `usr_${Date.now()}`,
      name: inviteName || inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'Pending Invite',
      twoFactorEnabled: false,
      lastActive: 'Never',
    };

    setMembers((prev) => [newMember, ...prev]);
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Manage organization access, assign role-based permissions, and invite collaborators."
        action={
          <Button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 bg-[#1B4FD8] hover:bg-[#1744b9] text-white shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Invite Teammate
          </Button>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Seats</span>
            <Users className="h-5 w-5 text-[#1B4FD8]" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{members.length}</p>
          <p className="mt-1 text-xs text-slate-400">4 of 10 available seats used</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">2FA Compliance</span>
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {Math.round((members.filter((m) => m.twoFactorEnabled).length / members.length) * 100)}%
          </p>
          <p className="mt-1 text-xs text-emerald-600">2 members with MFA verified</p>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Admins</span>
            <Lock className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {members.filter((m) => m.role === 'Admin' || m.role === 'Owner').length}
          </p>
          <p className="mt-1 text-xs text-slate-400">With full management rights</p>
        </Card>
      </div>

      {/* Member Directory Table */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or role..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <span className="text-xs text-slate-500 self-center">Showing {filteredMembers.length} members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Member</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">2FA</th>
                <th className="px-6 py-3.5">Last Active</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-[#1B4FD8]">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        member.role === 'Owner'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : member.role === 'Admin'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : member.role === 'Developer'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          member.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                      />
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Enabled
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{member.lastActive}</td>
                  <td className="px-6 py-4 text-right">
                    {member.role !== 'Owner' && (
                      <button
                        type="button"
                        onClick={() => setMembers((prev) => prev.filter((m) => m.id !== member.id))}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Modal Dialog */}
      {isInviteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="absolute right-5 top-5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1B4FD8]">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Invite a Teammate</h3>
                <p className="text-xs text-slate-500">Send an invitation link with preset role permissions.</p>
              </div>
            </div>

            {inviteSuccess ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-2 text-sm font-bold text-emerald-900">Invitation Dispatched!</p>
                <p className="text-xs text-emerald-700 mt-0.5">An email invite with login link was sent.</p>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Full Name (Optional)
                  </label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Kondwani Mwawa"
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Work Email Address
                  </label>
                  <Input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@business.mw"
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assigned Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Admin">Admin (Full portal management &amp; settings)</option>
                    <option value="Developer">Developer (API keys, webhooks, sandbox logs)</option>
                    <option value="Finance">Finance (Settlements, statements, export reports)</option>
                    <option value="Support">Support (View customer transaction status &amp; links)</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteOpen(false)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#1B4FD8] hover:bg-[#1744b9] text-white"
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
