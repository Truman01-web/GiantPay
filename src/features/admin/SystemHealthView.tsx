import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useSystemHealth } from './useAdminQueries';

interface ServiceRowProps {
  label: string;
  description: string;
  ok: boolean;
  loading: boolean;
}

function ServiceRow({ label, description, ok, loading }: ServiceRowProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-[var(--radius-lg)] border p-4 transition-colors ${
        ok
          ? 'border-[var(--color-green-200)] bg-[var(--color-green-50)]'
          : 'border-[var(--color-red-200)] bg-[var(--color-red-50)]'
      }`}
    >
      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-green-600)]" aria-hidden="true" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-red-600)] animate-pulse" aria-hidden="true" />
        )}
        <div>
          <p className="font-semibold text-[var(--color-neutral-900)]">{label}</p>
          <p className="text-[length:var(--text-help)] text-[var(--color-neutral-600)]">{description}</p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[length:var(--text-label)] font-semibold ${
          ok
            ? 'bg-[var(--color-green-100)] text-[var(--color-green-800)]'
            : 'bg-[var(--color-red-100)] text-[var(--color-red-800)]'
        }`}
      >
        {ok ? 'Operational' : 'Degraded'}
      </span>
    </div>
  );
}

export function SystemHealthView() {
  const query = useSystemHealth();

  const isLoading = query.isPending;
  const health = query.data;
  const allHealthy = health ? health.database && health.rateLimiter && health.workers : false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="System Health"
          description="Real-time status of core platform services. Auto-refreshes every 30 seconds."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          loading={query.isFetching}
          className="shrink-0"
        >
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {query.isError && !health ? (
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : 'We could not load system health.'}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          {/* Overall status banner */}
          {(health || isLoading) && (
            <div
              className={`flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 ${
                isLoading
                  ? 'border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]'
                  : allHealthy
                  ? 'border-[var(--color-green-200)] bg-[var(--color-green-50)]'
                  : 'border-[var(--color-red-200)] bg-[var(--color-red-50)]'
              }`}
            >
              {isLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <>
                  <span
                    className={`h-3 w-3 rounded-full shrink-0 ${allHealthy ? 'bg-[var(--color-green-500)]' : 'bg-[var(--color-red-500)] animate-pulse'}`}
                    aria-hidden="true"
                  />
                  <p className={`font-medium ${allHealthy ? 'text-[var(--color-green-900)]' : 'text-[var(--color-red-900)]'}`}>
                    {allHealthy
                      ? 'All systems are fully operational.'
                      : 'One or more services are experiencing issues.'}
                  </p>
                  {health && (
                    <span className="ml-auto text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
                      Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Service cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Services</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-5">
              <ServiceRow
                label="Database"
                description="Primary PostgreSQL cluster — reads, writes, and migrations"
                ok={health?.database ?? false}
                loading={isLoading}
              />
              <ServiceRow
                label="Rate Limiter"
                description="Redis-backed per-merchant and per-IP throttling"
                ok={health?.rateLimiter ?? false}
                loading={isLoading}
              />
              <ServiceRow
                label="Workers"
                description="Background job queue — webhooks, settlement runs, reconciliation"
                ok={health?.workers ?? false}
                loading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Overall status string from API */}
          {health && (
            <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
              API reported status: <span className="font-mono font-medium">{health.status}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
