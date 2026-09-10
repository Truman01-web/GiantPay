import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_PAYMENTS } from '../fixtures/payments';
import type { DashboardSummary, VolumePoint } from '@/services/api/dashboard';

const base = `${env.apiUrl}/v1`;

function inRange(iso: string, from: string, to: string): boolean {
  const t = new Date(iso).getTime();
  return t >= new Date(from).getTime() && t <= new Date(to).getTime() + 86_400_000;
}

export const dashboardHandlers = [
  http.get(`${base}/dashboard/summary`, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
    const to = url.searchParams.get('to') ?? new Date().toISOString();

    const inWindow = MOCK_PAYMENTS.filter((p) => inRange(p.createdAt, from, to));
    const successful = inWindow.filter((p) => p.status === 'SUCCEEDED' || p.status === 'PARTIALLY_REFUNDED' || p.status === 'REFUNDED');
    const pending = inWindow.filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING');
    const failed = inWindow.filter((p) => p.status === 'FAILED' || p.status === 'EXPIRED');

    const summary: DashboardSummary = {
      environment: 'sandbox',
      currency: 'MWK',
      totalProcessed: { amountMinor: successful.reduce((sum, p) => sum + p.gross.amountMinor, 0) },
      successfulCount: successful.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      refundedAmountMinor: inWindow.reduce((sum, p) => sum + p.refundedAmountMinor, 0),
      feesAmountMinor: successful.reduce((sum, p) => sum + p.fee.amountMinor, 0),
      successRate: inWindow.length ? successful.length / inWindow.length : 0,
      reconciliation: {
        matched: inWindow.filter((p) => p.reconciliationState === 'MATCHED').length,
        unmatched: inWindow.filter((p) => p.reconciliationState === 'UNRECONCILED').length,
        exceptions: inWindow.filter((p) => p.reconciliationState === 'EXCEPTION').length,
      },
      settlements: {
        available: 4,
        pending: successful.filter((p) => p.settlementState === 'PENDING').length,
        processing: 1,
        completed: successful.filter((p) => p.settlementState === 'SETTLED').length,
      },
      attentionQueue: [
        ...inWindow
          .filter((p) => p.reconciliationState === 'EXCEPTION')
          .slice(0, 3)
          .map((p) => ({
            id: `exc_${p.id}`,
            kind: 'RECONCILIATION_EXCEPTION' as const,
            label: `Reconciliation exception on ${p.reference}`,
            occurredAt: p.updatedAt,
            href: `/transactions/${p.id}`,
          })),
      ],
      recentTransactions: [...inWindow]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          reference: p.reference,
          customerName: p.customer.name,
          amountMinor: p.gross.amountMinor,
          status: p.status,
          createdAt: p.createdAt,
        })),
    };

    return HttpResponse.json(summary);
  }),

  http.get(`${base}/dashboard/volume`, ({ request }) => {
    const url = new URL(request.url);
    const from = new Date(url.searchParams.get('from') ?? new Date(Date.now() - 30 * 86_400_000).toISOString());
    const to = new Date(url.searchParams.get('to') ?? new Date().toISOString());

    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
    const points: VolumePoint[] = [];
    for (let i = 0; i <= days; i++) {
      const dayStart = new Date(from.getTime() + i * 86_400_000);
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const dayPayments = MOCK_PAYMENTS.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      const successful = dayPayments.filter((p) => p.status === 'SUCCEEDED');
      points.push({
        date: dayStart.toISOString().slice(0, 10),
        volumeMinor: successful.reduce((sum, p) => sum + p.gross.amountMinor, 0),
        transactionCount: dayPayments.length,
        successRate: dayPayments.length ? successful.length / dayPayments.length : 0,
      });
    }
    return HttpResponse.json(points);
  }),
];
