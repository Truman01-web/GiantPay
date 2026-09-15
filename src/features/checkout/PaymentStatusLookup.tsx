import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { usePaymentStatusPolling } from './usePaymentStatusPolling';
import { PaymentResult } from './PaymentResult';

/**
 * Standalone status page for `/payment/:reference` — the target a redirect
 * or shared link points to. Always re-fetches the trusted status; the
 * reference in the URL is only a lookup key, never a claim of outcome.
 */
export function PaymentStatusLookup() {
  const { reference } = useParams<{ reference: string }>();
  const polled = usePaymentStatusPolling(reference);

  if (!reference) {
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">Missing payment reference</h1>
        </CardContent>
      </Card>
    );
  }

  // Only treat this as a dead end once polling has actually given up
  // (permanent error, or the retry window elapsed) — a transient blip on
  // an early attempt shouldn't flash a "not found" message while the hook
  // is still retrying in the background. `error` is only ever non-null
  // once an attempt has actually concluded, so this can't fire on the
  // very first render before polling has even started.
  if (!polled.status && !polled.polling && polled.error) {
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">We couldn&apos;t find this payment</h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">{polled.error}</p>
          <Button variant="secondary" className="mt-4" onClick={polled.refresh}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!polled.status) return <FullPageLoader label="Checking payment status…" />;

  return <PaymentResult status={polled.status} polling={polled.polling} onRefresh={polled.refresh} />;
}
