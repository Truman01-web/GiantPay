import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
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

  if (polled.error && !polled.status) {
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">We couldn&apos;t find this payment</h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Double-check the link, or contact the merchant.</p>
        </CardContent>
      </Card>
    );
  }

  if (!polled.status) return <FullPageLoader label="Checking payment status…" />;

  return <PaymentResult status={polled.status} polling={polled.polling} onRefresh={polled.refresh} />;
}
