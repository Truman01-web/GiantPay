import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { StatCard } from '@/components/data-display/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/forms/DateRangePicker';
import { presetToRange } from '@/lib/dateRange';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ApiError } from '@/services/api/errors';
import { usePermission, useSession } from '@/hooks/useSession';
import { useDashboardSummary, useDashboardVolume } from './useDashboardQueries';
import { VolumeChart } from './VolumeChart';
import { format } from 'date-fns';

export function DashboardOverview() {
  const session = useSession();
  const [range, setRange] = useState(() => presetToRange('30d'));
  const canManageLinks = usePermission('payments.links:manage');

  const summaryQuery = useDashboardSummary(range);
  const volumeQuery = useDashboardVolume(range);

  return (
    <div>
      <PageHeader
        title={`Welcome back${session?.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}`}
        description={session?.user.merchantName ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <DateRangePicker value={range} onChange={setRange} />
            {canManageLinks && (
              <Button asChild>
                <Link to="/payment-links/create">Create payment link</Link>
              </Button>
            )}
          </div>
        }
      />

      {summaryQuery.isPending && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {summaryQuery.isError && (
        <ErrorState
          message={summaryQuery.error instanceof ApiError ? summaryQuery.error.message : 'We could not load your dashboard.'}
          requestId={summaryQuery.error instanceof ApiError ? summaryQuery.error.requestId : undefined}
          onRetry={() => summaryQuery.refetch()}
        />
      )}

      {summaryQuery.data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total processed"
              value={<AmountDisplay amountMinor={summaryQuery.data.totalProcessed.amountMinor} currency={summaryQuery.data.currency} size="lg" />}
              icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
            />
            <StatCard label="Successful" value={summaryQuery.data.successfulCount} icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />} />
            <StatCard label="Pending" value={summaryQuery.data.pendingCount} icon={<Clock className="h-5 w-5" aria-hidden="true" />} />
            <StatCard label="Failed" value={summaryQuery.data.failedCount} icon={<XCircle className="h-5 w-5" aria-hidden="true" />} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Success rate" value={`${Math.round(summaryQuery.data.successRate * 100)}%`} />
            <StatCard label="Refunded" value={<AmountDisplay amountMinor={summaryQuery.data.refundedAmountMinor} currency={summaryQuery.data.currency} />} />
            <StatCard label="Fees" value={<AmountDisplay amountMinor={summaryQuery.data.feesAmountMinor} currency={summaryQuery.data.currency} />} />
            <StatCard
              label="Reconciliation exceptions"
              value={summaryQuery.data.reconciliation.exceptions}
              trend={summaryQuery.data.reconciliation.exceptions > 0 ? { direction: 'down', label: 'Needs attention' } : undefined}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {volumeQuery.data && <VolumeChart points={volumeQuery.data} currency={summaryQuery.data.currency} />}
              {volumeQuery.isPending && <Skeleton className="h-72" />}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Needs attention</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summaryQuery.data.attentionQueue.length === 0 ? (
                  <EmptyState title="All caught up" description="No failed webhooks, information requests or unresolved exceptions." />
                ) : (
                  <ul className="divide-y divide-[var(--color-neutral-200)]">
                    {summaryQuery.data.attentionQueue.map((item) => (
                      <li key={item.id}>
                        <Link to={item.href} className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--color-neutral-50)]">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-amber-600)]" aria-hidden="true" />
                          <div>
                            <p className="text-[length:var(--text-label)] font-medium text-[var(--color-navy-900)]">{item.label}</p>
                            <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{format(new Date(item.occurredAt), 'd MMM, HH:mm')}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent transactions</CardTitle>
                <Link to="/transactions" className="text-[length:var(--text-label)] font-medium text-[var(--color-blue-600)] hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {summaryQuery.data.recentTransactions.length === 0 ? (
                  <EmptyState title="No transactions yet" description="Payments will appear here once customers start paying." />
                ) : (
                  <ul className="divide-y divide-[var(--color-neutral-200)]">
                    {summaryQuery.data.recentTransactions.map((t) => (
                      <li key={t.id}>
                        <Link to={`/transactions/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[var(--color-neutral-50)]">
                          <div className="min-w-0">
                            <p className="truncate text-[length:var(--text-label)] font-medium text-[var(--color-navy-900)]">{t.reference}</p>
                            <p className="truncate text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{t.customerName ?? 'Unknown customer'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <AmountDisplay amountMinor={t.amountMinor} currency={summaryQuery.data!.currency} size="sm" />
                            <div className="mt-1">
                              <StatusBadge status={t.status} />
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Settlement summary</CardTitle>
                <Link to="/settlements" className="text-[length:var(--text-label)] font-medium text-[var(--color-blue-600)] hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  {(
                    [
                      ['Available', summaryQuery.data.settlements.available],
                      ['Pending', summaryQuery.data.settlements.pending],
                      ['Processing', summaryQuery.data.settlements.processing],
                      ['Completed', summaryQuery.data.settlements.completed],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt>
                      <dd className="text-[length:var(--text-h3)] font-semibold tabular-nums text-[var(--color-navy-900)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
