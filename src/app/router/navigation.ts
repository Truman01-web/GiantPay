import {
  LayoutDashboard,
  Receipt,
  Link2,
  RotateCcw,
  Landmark,
  GitCompareArrows,
  FileBarChart,
  Code2,
  Users,
  ShieldCheck,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/types/auth';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const MERCHANT_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Onboarding', to: '/onboarding', icon: ShieldCheck, permission: 'onboarding:read' },
    ],
  },
  {
    label: 'Payments',
    items: [
      { label: 'Transactions', to: '/transactions', icon: Receipt, permission: 'payments:read' },
      { label: 'Payment links', to: '/payment-links', icon: Link2, permission: 'payments.links:manage' },
      { label: 'Refunds', to: '/refunds', icon: RotateCcw, permission: 'payments.refunds:request' },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Settlements', to: '/settlements', icon: Landmark, permission: 'settlements:read' },
      { label: 'Reconciliation', to: '/reconciliation', icon: GitCompareArrows, permission: 'reconciliation:read' },
      { label: 'Reports', to: '/reports', icon: FileBarChart, permission: 'reports:read' },
    ],
  },
  {
    label: 'Build',
    items: [{ label: 'Developers', to: '/developers', icon: Code2, permission: 'developer.apiKeys:manage' }],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Team', to: '/team', icon: Users, permission: 'team:read' },
      { label: 'Roles', to: '/roles', icon: ShieldCheck, permission: 'roles:read' },
      { label: 'Support', to: '/support', icon: LifeBuoy, permission: 'support:read' },
      { label: 'Settings', to: '/settings', icon: Settings, permission: 'security:manage:self' },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  { label: 'Overview', items: [{ label: 'Admin home', to: '/admin', icon: LayoutDashboard, permission: 'platform.health.read' }] },
  {
    label: 'Merchants',
    items: [
      { label: 'Applications', to: '/admin/merchant-applications', icon: ShieldCheck, permission: 'compliance:read' },
      { label: 'Merchants', to: '/admin/merchants', icon: Users, permission: 'platform.merchants.read' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Support', to: '/admin/support', icon: LifeBuoy, permission: 'platform.support.read' },
      { label: 'Transactions', to: '/admin/transactions', icon: Receipt, permission: 'platform.transactions.read' },
      { label: 'Refunds', to: '/admin/refunds', icon: RotateCcw, permission: 'platform.refunds.read' },
      { label: 'Refund approvals', to: '/admin/refunds/pending', icon: RotateCcw, permission: 'platform.refunds.read' },
      { label: 'Settlements', to: '/admin/settlements', icon: Landmark, permission: 'platform.settlements.read' },
      { label: 'Reconciliation', to: '/admin/reconciliation', icon: GitCompareArrows, permission: 'platform.reconciliation.read' },
      { label: 'Exceptions', to: '/admin/exceptions', icon: GitCompareArrows, permission: 'platform.reconciliation.read' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Providers', to: '/admin/providers', icon: Code2, permission: 'platform.operations.read' },
      { label: 'Users', to: '/admin/users', icon: Users, permission: 'team:read' },
      { label: 'Roles', to: '/admin/roles', icon: ShieldCheck, permission: 'roles:read' },
      { label: 'Audit logs', to: '/admin/audit-logs', icon: FileBarChart, permission: 'platform.audit.read' },
      { label: 'Incidents', to: '/admin/incidents', icon: ShieldCheck, permission: 'platform.incidents.read' },
      { label: 'Security', to: '/admin/security', icon: ShieldCheck, permission: 'platform.controls.read' },
      { label: 'Reports', to: '/admin/reports', icon: FileBarChart, permission: 'platform.metrics.read' },
      { label: 'System health', to: '/admin/system-health', icon: LayoutDashboard, permission: 'platform.health.read' },
      { label: 'Settings', to: '/admin/settings', icon: Settings, permission: 'platform.operations.read' },
    ],
  },
];
