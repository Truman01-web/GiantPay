import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api/client';

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
      <section className="relative overflow-hidden bg-[#061428] pb-14 pt-28 text-white sm:pb-16 sm:pt-36">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Home
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-emerald-400">Operational telemetry</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">System Status</h1>
          <p className="mt-2 text-sm text-white/70">Live readiness of the GiantPay sandbox backend.</p>
        </div>
      </section>
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
