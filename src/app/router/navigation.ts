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
  { label: 'Overview', items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
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
  { label: 'Overview', items: [{ label: 'Admin home', to: '/admin', icon: LayoutDashboard }] },
  {
    label: 'Merchants',
    items: [
      { label: 'Applications', to: '/admin/merchant-applications', icon: ShieldCheck },
      { label: 'Merchants', to: '/admin/merchants', icon: Users },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Support', to: '/admin/support', icon: LifeBuoy, permission: 'platform.support.read' },
      { label: 'Transactions', to: '/admin/transactions', icon: Receipt },
      { label: 'Refund approvals', to: '/admin/refunds/pending', icon: RotateCcw },
      { label: 'Settlements', to: '/admin/settlements', icon: Landmark },
      { label: 'Reconciliation', to: '/admin/reconciliation', icon: GitCompareArrows },
      { label: 'Exceptions', to: '/admin/exceptions', icon: GitCompareArrows },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Providers', to: '/admin/providers', icon: Code2 },
      { label: 'Users', to: '/admin/users', icon: Users },
      { label: 'Roles', to: '/admin/roles', icon: ShieldCheck },
      { label: 'Audit logs', to: '/admin/audit-logs', icon: FileBarChart },
      { label: 'Incidents', to: '/admin/incidents', icon: ShieldCheck },
      { label: 'Security', to: '/admin/security', icon: ShieldCheck },
      { label: 'Reports', to: '/admin/reports', icon: FileBarChart },
      { label: 'System health', to: '/admin/system-health', icon: LayoutDashboard },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
];
