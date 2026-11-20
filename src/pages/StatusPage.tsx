import { Info, RefreshCw } from 'lucide-react';
import { PageHero } from '@/components/hero';
import { environmentLabel, statusColour, useApiStatus } from '@/features/status/useApiStatus';

export default function StatusPage() {
  const readiness = useApiStatus();
  const state = readiness.state;

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
            API health
          </span>
        }
        description="A live check of the configured GiantPay API."
      >
        System Status
      </PageHero>

      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[var(--color-navy-900)]">GiantPay API status</h2>
              <p className="mt-1 text-sm text-[var(--color-neutral-600)]">
                {environmentLabel()}<br />{readiness.data ? `Last check: ${new Date(readiness.data.checkedAt).toLocaleString()}${readiness.stale ? ' (stale)' : ''}` : 'Waiting for the first check.'}
              </p>
            </div>
            <span role="status" aria-atomic="true" className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"><span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColour(state) }} />{state === 'Unknown' ? 'Unknown — Unable to verify' : state}</span>
          </div>
          {state === 'Unknown' && <p className="mt-4 text-sm text-slate-600">Unable to verify API health. A network failure, timeout, browser access restriction, stale result or unexpected response can cause this.</p>}
          {state === 'Degraded' && <p className="mt-4 text-sm text-amber-700">The API is responding but is not ready to serve requests.</p>}
          {state === 'Unavailable' && <p className="mt-4 text-sm text-red-700">The API reported that it is unavailable.</p>}
          <button type="button" onClick={() => void readiness.refresh()} aria-disabled={readiness.isFetching} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--color-neutral-300)] px-4 py-2 text-sm font-semibold aria-disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${readiness.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh status
          </button>
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--color-neutral-50)] p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[var(--color-neutral-600)]">This checks GiantPay API health only. A healthy API does not mean live payments or settlement are enabled. Third-party provider availability is not checked.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
