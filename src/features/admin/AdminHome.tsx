import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { useComplianceApplications, usePendingRefunds, useSystemHealth } from './useAdminQueries';

function HealthIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${ok ? 'bg-[var(--color-green-500)]' : 'bg-[var(--color-red-500)] animate-pulse'}`}
        aria-hidden="true"
      />
      <span className="text-[length:var(--text-body)] text-[var(--color-neutral-700)]">{label}</span>
      <span className={`ml-auto text-[length:var(--text-label)] font-medium ${ok ? 'text-[var(--color-green-600)]' : 'text-[var(--color-red-600)]'}`}>
        {ok ? 'OK' : 'Degraded'}
      </span>
    </div>
  );
}

export function AdminHome() {
  const applicationsQuery = useComplianceApplications({ pageSize: 100 });
  const pendingRefundsQuery = usePendingRefunds({ pageSize: 100 });
  const healthQuery = useSystemHealth();

  const pendingCount = applicationsQuery.data?.items.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'INFO_REQUESTED',
  ).length ?? 0;
  const underReviewCount = applicationsQuery.data?.items.filter(
    (a) => a.status === 'UNDER_REVIEW',
  ).length ?? 0;
  const pendingRefundsCount = pendingRefundsQuery.data?.total ?? 0;

  const health = healthQuery.data;
  const allHealthy = health ? health.database && health.rateLimiter && health.workers : true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-navy-900)]">Admin Home</h1>
        <p className="mt-1 text-sm text-[var(--color-neutral-600)]">
          Platform-wide activity summary and operational health.
        </p>
      </div>

      {/* System health banner */}
      {health && (
        <div
          className={`flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-sm ${
            allHealthy
              ? 'border-[var(--color-green-200)] bg-[var(--color-green-50)] text-[var(--color-green-900)]'
              : 'border-[var(--color-red-200)] bg-[var(--color-red-50)] text-[var(--color-red-900)]'
          }`}
        >
          <Activity className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {allHealthy
              ? 'All systems operational. No incidents detected.'
              : 'One or more platform services are degraded. Check System Health for details.'}
          </span>
          <Link
            to="/admin/system-health"
            className="ml-auto whitespace-nowrap font-medium underline underline-offset-2"
          >
            View health →
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pending applications */}
        <Link to="/admin/merchant-applications" className="group block">
          <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-amber-50)] text-[var(--color-amber-600)]">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--color-neutral-400)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <div className="mt-4">
              <p className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">Awaiting Review</p>
              <p className="text-3xl font-bold tabular-nums text-[var(--color-navy-900)]">
                {applicationsQuery.isPending ? '—' : pendingCount}
              </p>
              <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
                Merchant applications pending action
              </p>
            </div>
          </Card>
        </Link>

        {/* Under review */}
        <Link to="/admin/merchant-applications" className="group block">
          <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-blue-50)] text-[var(--color-blue-600)]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--color-neutral-400)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <div className="mt-4">
              <p className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">Under Review</p>
              <p className="text-3xl font-bold tabular-nums text-[var(--color-navy-900)]">
                {applicationsQuery.isPending ? '—' : underReviewCount}
              </p>
              <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
                KYB applications in compliance review
              </p>
            </div>
          </Card>
        </Link>

        {/* Pending refund approvals */}
        <Link to="/admin/refunds/pending" className="group block">
          <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] ${
                  pendingRefundsCount > 0
                    ? 'bg-[var(--color-red-50)] text-[var(--color-red-600)]'
                    : 'bg-[var(--color-green-50)] text-[var(--color-green-600)]'
                }`}
              >
                {pendingRefundsCount > 0 ? (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--color-neutral-400)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <div className="mt-4">
              <p className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">Refund Approvals</p>
              <p className="text-3xl font-bold tabular-nums text-[var(--color-navy-900)]">
                {pendingRefundsQuery.isPending ? '—' : pendingRefundsCount}
              </p>
              <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
                Refunds awaiting maker-checker sign-off
              </p>
            </div>
          </Card>
        </Link>
      </div>

      {/* System health detail */}
      {health && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-navy-900)]">
                System Health
              </h2>
              <Link
                to="/admin/system-health"
                className="text-[length:var(--text-label)] font-medium text-[var(--color-blue-600)] hover:underline"
              >
                Full details →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <HealthIndicator ok={health.database} label="Database" />
              <HealthIndicator ok={health.rateLimiter} label="Rate Limiter" />
              <HealthIndicator ok={health.workers} label="Workers" />
            </div>
            <p className="mt-4 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-navy-900)]">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: 'Merchant Applications', to: '/admin/merchant-applications' },
              { label: 'Refund Approvals', to: '/admin/refunds/pending' },
              { label: 'All Transactions', to: '/admin/transactions' },
              { label: 'All Settlements', to: '/admin/settlements' },
              { label: 'Audit Logs', to: '/admin/audit-logs' },
              { label: 'System Health', to: '/admin/system-health' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] px-3 py-2.5 text-center text-[length:var(--text-label)] font-medium text-[var(--color-navy-800)] transition-colors hover:border-[var(--color-blue-300)] hover:bg-[var(--color-blue-50)] hover:text-[var(--color-blue-700)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
