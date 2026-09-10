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
  | 'reconciliation:read'
  | 'reconciliation:manage'
  | 'reports:read'
  | 'developer.apiKeys:manage'
  | 'developer.webhooks:manage'
  | 'team:manage'
  | 'roles:manage'
  | 'settings:manage'
  | 'support:read'
  | 'support:manage'
  | 'compliance:read'
  | 'admin.merchants:review'
  | 'admin.refunds:approve'
  | 'admin.platform:manage';

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
