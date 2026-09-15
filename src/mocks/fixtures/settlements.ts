import { MOCK_PAYMENTS } from './payments';
import type { Settlement, SettlementListItem, SettlementStatus } from '@/types/settlements';

// Derived from MOCK_PAYMENTS (grouped into daily batches) rather than a
// second, disconnected fake dataset — a settlement batches real
// transactions, so its mock data should be traceable back to them, the
// same way a real settlement service would be built.

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function maskDestination(seed: number): string {
  return seed % 2 === 0 ? `Standard Bank ••••${((1000 + seed * 37) % 10000).toString().padStart(4, '0')}` : `+265 99• ••• ${((100 + seed * 13) % 1000).toString().padStart(3, '0')}`;
}

function statusForBatch(hasPending: boolean, index: number): SettlementStatus {
  if (hasPending) return index % 6 === 0 ? 'FAILED' : 'PENDING';
  if (index % 5 === 0) return 'AVAILABLE';
  if (index % 4 === 0) return 'PROCESSING';
  return 'COMPLETED';
}

function buildSettlements(): Settlement[] {
  const settleable = MOCK_PAYMENTS.filter((p) => p.settlementState !== 'NOT_SETTLED');
  const byDay = new Map<string, typeof settleable>();
  for (const payment of settleable) {
    const key = dayKey(payment.createdAt);
    const list = byDay.get(key);
    if (list) list.push(payment);
    else byDay.set(key, [payment]);
  }

  const days = [...byDay.keys()].sort();
  const settlements = days.map((day, index) => {
    const payments = byDay.get(day)!;
    const currency = payments[0].gross.currency;
    const amountMinor = payments.reduce((sum, p) => sum + p.net.amountMinor, 0);
    const hasPending = payments.some((p) => p.settlementState === 'PENDING');
    const status = statusForBatch(hasPending, index);
    const periodStart = `${day}T00:00:00.000Z`;
    const periodEnd = `${day}T23:59:59.999Z`;
    const completedAt = status === 'COMPLETED' ? new Date(new Date(periodEnd).getTime() + 2 * 86_400_000).toISOString() : null;

    const settlement: Settlement = {
      id: `stl_${day.replace(/-/g, '')}`,
      reference: `STL-${day.replace(/-/g, '')}`,
      amount: { amountMinor, currency },
      periodStart,
      periodEnd,
      status,
      destinationType: index % 2 === 0 ? 'BANK_ACCOUNT' : 'MOBILE_MONEY',
      destinationMasked: maskDestination(index),
      createdAt: periodEnd,
      completedAt,
      transactionCount: payments.length,
      transactions: payments.map((p) => ({ id: p.id, reference: p.reference, amount: p.net, createdAt: p.createdAt })),
    };
    return settlement;
  });

  return settlements.reverse();
}

export const MOCK_SETTLEMENTS: Settlement[] = buildSettlements();

export function toSettlementListItem(s: Settlement): SettlementListItem {
  return {
    id: s.id,
    reference: s.reference,
    amount: s.amount,
    periodStart: s.periodStart,
    periodEnd: s.periodEnd,
    status: s.status,
    destinationMasked: s.destinationMasked,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
    transactionCount: s.transactionCount,
  };
}
