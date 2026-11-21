export const demoCurrencies = ['MWK', 'USD', 'EUR', 'GBP'] as const;
export type DemoCurrency = (typeof demoCurrencies)[number];
// Invented teaching values, NOT market rates or provider prices.
const syntheticUnits: Record<DemoCurrency, bigint> = {
  MWK: 200000n,
  USD: 100n,
  EUR: 90n,
  GBP: 80n,
};
const roundHalfUp = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;

export function parseDemoAmount(value: string): bigint {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw new Error(
      'Enter a positive amount with at most 2 decimal places (maximum 999,999,999.99).',
    );
  const [whole, fraction = ''] = value.split('.');
  const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor <= 0n) throw new Error('Amount must be greater than zero.');
  return minor;
}

export function formatDemoMinor(minor: bigint, digits = 2): string {
  const divisor = 10n ** BigInt(digits);
  return `${minor / divisor}.${(minor % divisor).toString().padStart(digits, '0')}`;
}

export function createDemoQuote(amount: string, from: DemoCurrency, to: DemoCurrency, now: number) {
  if (!demoCurrencies.includes(from) || !demoCurrencies.includes(to) || from === to)
    throw new Error('Choose two different supported demonstration currencies.');
  const sourceMinor = parseDemoAmount(amount);
  const numerator = syntheticUnits[to],
    denominator = syntheticUnits[from];
  const destinationMinor = roundHalfUp(sourceMinor * numerator, denominator);
  if (destinationMinor === 0n)
    throw new Error('This amount is too small for the destination currency.');
  const feeMinor = roundHalfUp(sourceMinor * 150n, 10000n); // invented 1.50% fee
  return {
    sourceMinor,
    destinationMinor,
    feeMinor,
    totalMinor: sourceMinor + feeMinor,
    rate: formatDemoMinor(roundHalfUp(numerator * 1000000n, denominator), 6),
    from,
    to,
    createdAt: now,
    expiresAt: now + 60000,
    kind: 'SYNTHETIC_DEMO' as const,
  };
}

export function demoQuoteStatus(expiresAt: number, now: number) {
  return now >= expiresAt ? 'EXPIRED' : 'DEMONSTRATION_READY';
}
