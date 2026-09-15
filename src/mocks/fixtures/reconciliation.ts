import { MOCK_PAYMENTS } from './payments';
import { formatMoney } from '@/lib/money';
import type { ReconciliationException, ReconciliationExceptionType, ReconciliationRun } from '@/types/reconciliation';

// Derived from MOCK_PAYMENTS the same way settlements are — a
// reconciliation run and its exceptions are always about real
// transactions, so the mock data is generated from them rather than an
// independent fake dataset. Payment.reconciliationState already carries
// MATCHED/UNRECONCILED/EXCEPTION per payment (see types/payments.ts); this
// groups that into runs and expands EXCEPTION payments into full exception
// records.

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function providerFor(channel: string): string {
  if (channel === 'MOBILE_MONEY') return 'Sandbox Mobile Money';
  if (channel === 'CARD') return 'Sandbox Card Gateway';
  return 'Sandbox Bank Transfer';
}

const EXCEPTION_TYPES: ReconciliationExceptionType[] = ['AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'MISSING_IN_PROVIDER', 'MISSING_IN_LEDGER'];

function buildException(payment: (typeof MOCK_PAYMENTS)[number], index: number, runId: string): ReconciliationException {
  const type = EXCEPTION_TYPES[index % EXCEPTION_TYPES.length];
  let expected: string;
  let observed: string;
  let difference: string | null;

  if (type === 'AMOUNT_MISMATCH') {
    const driftMinor = 100 + ((index * 37) % 5000);
    const observedMinor = Math.max(0, payment.gross.amountMinor - driftMinor);
    expected = formatMoney(payment.gross.amountMinor, payment.gross.currency);
    observed = formatMoney(observedMinor, payment.gross.currency);
    difference = formatMoney(payment.gross.amountMinor - observedMinor, payment.gross.currency);
  } else if (type === 'STATUS_MISMATCH') {
    expected = payment.status;
    observed = 'FAILED';
    difference = null;
  } else if (type === 'MISSING_IN_PROVIDER') {
    expected = 'Present in provider settlement file';
    observed = 'Not found in provider settlement file';
    difference = null;
  } else {
    expected = 'Present in GiantPay ledger';
    observed = 'Missing ledger entry';
    difference = null;
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(payment.updatedAt).getTime()) / 86_400_000));

  return {
    id: `rxc_${payment.id}`,
    runId,
    transactionId: payment.id,
    transactionReference: payment.reference,
    type,
    expected,
    observed,
    difference,
    owner: null,
    priority: ageDays > 5 ? 'HIGH' : ageDays > 2 ? 'MEDIUM' : 'LOW',
    status: 'OPEN',
    createdAt: payment.updatedAt,
    notes: [],
  };
}

function buildRuns(): ReconciliationRun[] {
  const byDay = new Map<string, typeof MOCK_PAYMENTS>();
  for (const payment of MOCK_PAYMENTS) {
    const key = dayKey(payment.createdAt);
    const list = byDay.get(key);
    if (list) list.push(payment);
    else byDay.set(key, [payment]);
  }

  const days = [...byDay.keys()].sort();
  const runs = days.map((day, index) => {
    const payments = byDay.get(day)!;
    const runId = `rcn_${day.replace(/-/g, '')}`;
    const matchedCount = payments.filter((p) => p.reconciliationState === 'MATCHED').length;
    const unmatchedCount = payments.filter((p) => p.reconciliationState === 'UNRECONCILED').length;
    const exceptionPayments = payments.filter((p) => p.reconciliationState === 'EXCEPTION');
    const exceptions = exceptionPayments.map((p, i) => buildException(p, i, runId));
    const completedAt = new Date(`${day}T23:59:59.999Z`).getTime() + 3600_000;

    const run: ReconciliationRun = {
      id: runId,
      provider: providerFor(payments[0].channel),
      periodStart: `${day}T00:00:00.000Z`,
      periodEnd: `${day}T23:59:59.999Z`,
      totalRecords: payments.length,
      matchedCount,
      unmatchedCount,
      exceptionCount: exceptions.length,
      status: index % 17 === 0 ? 'FAILED' : 'COMPLETED',
      completedAt: new Date(completedAt).toISOString(),
      exceptions,
    };
    return run;
  });

  return runs.reverse();
}

export const MOCK_RECONCILIATION_RUNS: ReconciliationRun[] = buildRuns();
