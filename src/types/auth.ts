/**
 * Role and permission model.
 *
 * IMPORTANT: authorization decisions in this app are made against the
 * `permissions` string list on the session, never by inferring capability
 * from `role`. Role names are provided for display and invite defaults
 * only. This permission list is modeled from the product spec — reconcile
 * against the real backend contract before production (see HANDOVER.md).
 */
export type MerchantRole =
  | 'OWNER'
  | 'ADMIN'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'DEVELOPER'
  | 'SUPPORT'
  | 'COMPLIANCE'
  | 'VIEWER';

export type PlatformRole = 'PLATFORM_ADMIN';

export type Role = MerchantRole | PlatformRole;

export type Permission =
  | 'payments:read'
  | 'payments.links:manage'
  | 'payments.refunds:request'
  | 'payments.refunds:approve'
  | 'settlements:read'
  | 'settlements:manage'
  | 'settlements:approve'
  | 'reconciliation:read'
  | 'reconciliation:manage'
  | 'reconciliation:approve'
  | 'ledger:read'
  | 'ledger:integrity'
  | 'reports:read'
  | 'reports:export'
  | 'audit:read'
  | 'developer.apiKeys:manage'
  | 'developer.webhooks:manage'
  | 'team:read'
  | 'team:manage'
  | 'roles:read'
  | 'roles:manage'
  | 'sessions:read'
  | 'sessions:manage'
  | 'security:manage:self'
  | 'onboarding:read'
  | 'onboarding:write'
  | 'onboarding:submit'
  | 'support:read'
  | 'support:write'
  | 'compliance:read'
  | 'compliance:review'
  | 'compliance:approve'
  | 'platform.audit.read'
  | 'platform.health.read'
  | 'platform.merchants.read'
  | 'platform.transactions.read'
  | 'platform.refunds.read'
  | 'platform.settlements.read'
  | 'platform.reconciliation.read'
  | 'platform.support.read'
  | 'platform.support.assign'
  | 'platform.support.reply'
  | 'platform.support.manage'
  | 'platform.operations.read'
  | 'platform.metrics.read'
  | 'platform.controls.read'
  | 'platform.controls.propose'
  | 'platform.controls.approve'
  | 'platform.incidents.read'
  | 'platform.incidents.manage';

export interface MfaChallenge {
  challengeId: string;
  method: 'TOTP' | 'SMS' | 'EMAIL';
  codeLength: number;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  merchantId: string | null;
  merchantName: string | null;
  mfaEnabled: boolean;
}

export type Environment = 'sandbox' | 'production';

export interface Session {
  user: AuthenticatedUser;
  environment: Environment;
  environments: Environment[];
}

export function hasPermission(session: Session | null, permission: Permission): boolean {
  return session?.user.permissions.includes(permission) ?? false;
}

export function hasAnyPermission(session: Session | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(session, p));
}
