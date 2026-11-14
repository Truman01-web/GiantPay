import { useQuery } from '@tanstack/react-query';
import { Info, RefreshCw } from 'lucide-react';
import { api } from '@/services/api/client';
import { PageHero } from '@/components/hero';

type Readiness = { status: string; timestamp?: string };

export default function StatusPage() {
  const readiness = useQuery({
    queryKey: ['public-readiness'],
    queryFn: ({ signal }) => api.get<Readiness>('/health/ready', { signal, timeoutMs: 5000 }),
    retry: false,
    refetchInterval: 30_000,
  });
  const state = readiness.isLoading ? 'Checking' : readiness.isError ? 'Unavailable' : 'Operational';
  const stateClass = readiness.isError
    ? 'border-red-200 bg-red-50 text-red-700'
    : readiness.isLoading
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div>
      <PageHero
        variant="dark"
        flatScrim
        image="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80"
        imageClassName="object-cover object-center opacity-100"
        padding="pt-28 pb-14 sm:pt-36 sm:pb-16"
        containerClassName="mx-auto max-w-4xl px-4 sm:px-6"
        eyebrow={
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Operational Telemetry
          </span>
        }
        description="Status of GiantPay's sandbox APIs and core platform services."
      >
        System Status
      </PageHero>

      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[var(--color-navy-900)]">Sandbox API readiness</h2>
              <p className="mt-1 text-sm text-[var(--color-neutral-600)]" aria-live="polite">
                {readiness.data?.timestamp ? `Last backend reading: ${new Date(readiness.data.timestamp).toLocaleString()}` : 'The status check is bounded to five seconds.'}
              </p>
            </div>
            <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${stateClass}`}>{state}</span>
          </div>
          {readiness.isError && <p role="alert" className="mt-4 text-sm text-red-700">The sandbox did not pass its readiness check. Retry shortly; no successful provider state is being inferred.</p>}
          <button type="button" onClick={() => void readiness.refetch()} disabled={readiness.isFetching} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--color-neutral-300)] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${readiness.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh status
          </button>
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--color-neutral-50)] p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[var(--color-neutral-600)]">This is sandbox readiness, not a production uptime claim. Live payments, payouts, SMS and unconfigured email delivery remain outside this status.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
