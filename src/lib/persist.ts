/**
 * Allowlisted, best-effort localStorage access for non-sensitive UI-only
 * preferences (sidebar collapsed, last-selected date range, etc.).
 *
 * Never use this for session tokens, API secrets, or any payment/customer
 * data — see docs/frontend-security.md.
 */
const ALLOWED_KEYS = new Set([
  'giantpay.ui.sidebarCollapsed',
  'giantpay.ui.environment',
  'giantpay.ui.lastDateRange',
] as const);

export type PersistKey = 'giantpay.ui.sidebarCollapsed' | 'giantpay.ui.environment' | 'giantpay.ui.lastDateRange';

export function readPersisted<T>(key: PersistKey, fallback: T): T {
  if (!ALLOWED_KEYS.has(key)) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writePersisted<T>(key: PersistKey, value: T): void {
  if (!ALLOWED_KEYS.has(key)) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota) — non-critical, ignore.
  }
}
