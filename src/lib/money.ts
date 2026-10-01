/**
 * Money handling for GiantPay.
 *
 * Authoritative amounts are always integers in a currency's minor unit
 * (e.g. tambala for MWK), exactly as returned by the backend. This module
 * never performs floating-point math on an authoritative amount — only
 * integer arithmetic (safe for JS numbers within Number.MAX_SAFE_INTEGER)
 * and locale formatting for *display*, which is presentation-only and never
 * fed back into a calculation.
 */

export interface Money {
  /** Integer amount in the currency's minor unit. Never a decimal/float. */
  amountMinor: number;
  currency: string;
}

/** Minor-unit exponent per currency. Falls back to 2 (matches MWK/ISO 4217). */
const MINOR_UNIT_DIGITS: Record<string, number> = {
  MWK: 2,
};

export function minorUnitDigits(currency: string): number {
  return MINOR_UNIT_DIGITS[currency.toUpperCase()] ?? 2;
}

/** Add two amounts of the same currency using integer arithmetic. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add mismatched currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract mismatched currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function isPositive(m: Money): boolean {
  return m.amountMinor > 0;
}

/**
 * Format an integer minor-unit amount for display.
 * This is a pure presentation step — never parse this string back into an
 * authoritative amount.
 */
export function formatMoney(
  amountMinor: number,
  currency: string,
  options?: { signDisplay?: 'auto' | 'always' | 'never' },
): string {
  const digits = minorUnitDigits(currency);
  const major = amountMinor / 10 ** digits;
  try {
    return new Intl.NumberFormat('en-MW', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: options?.signDisplay ?? 'auto',
    }).format(major);
  } catch {
    // Currency code not recognized by Intl (e.g. a sandbox/test code) —
    // fall back to a manual, still-locale-correct-enough rendering.
    const sign = amountMinor < 0 ? '-' : '';
    return `${sign}${currency.toUpperCase()} ${Math.abs(major).toFixed(digits)}`;
  }
}

/** Formats an API integer string without converting it through Number. */
export function formatMinorUnitsExact(amountMinor: string, currency: string): string {
  if (!/^-?\d+$/.test(amountMinor)) return `${currency.toUpperCase()} —`;
  const digits = minorUnitDigits(currency);
  const value = BigInt(amountMinor);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const scale = 10n ** BigInt(digits);
  const whole = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(digits, '0');
  const grouped = new Intl.NumberFormat('en-MW', { maximumFractionDigits: 0 }).format(whole);
  return `${negative ? '-' : ''}${currency.toUpperCase()} ${grouped}${digits ? `.${fraction}` : ''}`;
}

/** Parse a user-entered decimal string (e.g. "1,250.00") into minor units. */
export function parseMoneyInput(input: string, currency: string): number | null {
  const cleaned = input.replace(/,/g, '').trim();
  if (cleaned === '' || Number.isNaN(Number(cleaned))) return null;
  const digits = minorUnitDigits(currency);
  const [whole, fraction = ''] = cleaned.split('.');
  if (!/^\d+$/.test(whole)) return null;
  if (fraction && !/^\d+$/.test(fraction)) return null;
  const paddedFraction = fraction.padEnd(digits, '0').slice(0, digits);
  const minor = Number(whole) * 10 ** digits + Number(paddedFraction || '0');
  return Number.isSafeInteger(minor) ? minor : null;
}
