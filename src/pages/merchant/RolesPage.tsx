import { PageHeader } from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { Shield, Check, X, Info, Lock, Terminal, CreditCard, Landmark } from 'lucide-react';

interface PermissionRow {
  category: string;
  action: string;
  owner: boolean;
  admin: boolean;
  developer: boolean;
  finance: boolean;
  support: boolean;
}

const PERMISSION_MATRIX: PermissionRow[] = [
  // Payments
  { category: 'Payments', action: 'View all transaction records & details', owner: true, admin: true, developer: true, finance: true, support: true },
  { category: 'Payments', action: 'Initiate manual transaction refunds', owner: true, admin: true, developer: false, finance: true, support: false },
  { category: 'Payments', action: 'Create and edit payment links', owner: true, admin: true, developer: true, finance: true, support: false },
  // Developer
  { category: 'Developer Tools', action: 'View & copy live REST API keys', owner: true, admin: true, developer: true, finance: false, support: false },
  { category: 'Developer Tools', action: 'Rotate API keys & manage webhooks', owner: true, admin: true, developer: true, finance: false, support: false },
  { category: 'Developer Tools', action: 'Access sandbox testing telemetry', owner: true, admin: true, developer: true, finance: true, support: true },
  // Settlements & Finance
  { category: 'Settlements & Banking', action: 'View net payout statements & ledger', owner: true, admin: true, developer: false, finance: true, support: false },
  { category: 'Settlements & Banking', action: 'Change destination settlement bank account', owner: true, admin: false, developer: false, finance: false, support: false },
  { category: 'Settlements & Banking', action: 'Export tax and reconciliation reports', owner: true, admin: true, developer: false, finance: true, support: false },
  // Administration & Team
  { category: 'Administration', action: 'Invite and remove team members', owner: true, admin: true, developer: false, finance: false, support: false },
  { category: 'Administration', action: 'Modify organization security & 2FA rules', owner: true, admin: true, developer: false, finance: false, support: false },
  { category: 'Administration', action: 'Submit merchant verification / KYC profile', owner: true, admin: true, developer: false, finance: false, support: false },
];

const ROLES_INFO = [
  {
    name: 'Owner',
    tag: 'Primary Executive',
    desc: 'Ultimate legal authority over merchant account, bank changes, and company registration.',
    icon: Lock,
    color: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  {
    name: 'Admin',
    tag: 'Operations Lead',
    desc: 'Full day-to-day administrative authority, team management, and settings configuration.',
    icon: Shield,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    name: 'Developer',
    tag: 'Technical Engineer',
    desc: 'Manages API integration, webhook endpoints, testing payloads, and error logs.',
    icon: Terminal,
    color: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    name: 'Finance',
    tag: 'Accounting & Reconciliation',
    desc: 'Focuses on settlement statements, payout logs, tax exports, and refund reconciliation.',
    icon: Landmark,
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    name: 'Support',
    tag: 'Customer Care',
    desc: 'Read-only access to customer payment references and real-time transaction statuses.',
    icon: CreditCard,
    color: 'border-slate-200 bg-slate-100 text-slate-700',
  },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles &amp; Permissions"
        description="Review access tiers and granular capability permissions across your GiantPay merchant account."
      />

      {/* Role Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES_INFO.map((role) => {
          const Icon = role.icon;
          return (
            <Card key={role.name} className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${role.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{role.name}</h4>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{role.tag}</span>
                </div>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-slate-500 leading-relaxed">{role.desc}</p>
            </Card>
          );
        })}
      </div>

      {/* Permissions Matrix Table */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Granular Permissions Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">Summary of actions permitted for each designated team role.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-[#1B4FD8]" />
            <span>Changes to role assignments can be made in the Team tab</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-3.5 min-w-[280px]">Operational Capability</th>
                <th className="px-4 py-3.5 text-center">Owner</th>
                <th className="px-4 py-3.5 text-center">Admin</th>
                <th className="px-4 py-3.5 text-center">Developer</th>
                <th className="px-4 py-3.5 text-center">Finance</th>
                <th className="px-4 py-3.5 text-center">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSION_MATRIX.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-slate-800">{row.action}</p>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">{row.category}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.owner ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.admin ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.developer ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.finance ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.support ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center text-slate-300">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
