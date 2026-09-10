import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { CopyButton } from '@/components/ui/CopyButton';
import type { TrustedPaymentStatus } from '@/services/api/checkout';

export function PaymentResult({
  status,
  polling,
  onRefresh,
}: {
  status: TrustedPaymentStatus;
  polling: boolean;
  onRefresh: () => void;
}) {
  if (status.status === 'SUCCESS') {
    return (
      <Card>
        <CardContent className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--color-green-600)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Payment successful</h1>
          <div className="mt-2">
            <AmountDisplay amountMinor={status.amount.amountMinor} currency={status.amount.currency} size="xl" />
          </div>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Paid to {status.merchantDisplayName}</p>
          <dl className="mt-5 flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--color-neutral-50)] p-4 text-left">
            <div className="flex items-center justify-between">
              <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">GiantPay reference</dt>
              <dd className="flex items-center gap-1 text-[length:var(--text-label)] font-medium tabular-nums">
                {status.reference}
                <CopyButton value={status.reference} label="" />
              </dd>
            </div>
            {status.merchantReference && (
              <div className="flex items-center justify-between">
                <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Merchant reference</dt>
                <dd className="text-[length:var(--text-label)] font-medium">{status.merchantReference}</dd>
              </div>
            )}
            {status.confirmedAt && (
              <div className="flex items-center justify-between">
                <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Confirmed</dt>
                <dd className="text-[length:var(--text-label)] font-medium">{format(new Date(status.confirmedAt), 'd MMM yyyy, HH:mm')}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    );
  }

  if (status.status === 'FAILED') {
    return (
      <Card>
        <CardContent className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-[var(--color-red-600)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Payment failed</h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            We couldn&apos;t complete this payment. No funds were captured.
          </p>
          <p className="mt-3 text-[length:var(--text-help)] tabular-nums text-[var(--color-neutral-500)]">Reference: {status.reference}</p>
        </CardContent>
      </Card>
    );
  }

  if (status.status === 'EXPIRED') {
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">This payment session expired</h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            Ask {status.merchantDisplayName} for a new payment link to try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  // PENDING / PROCESSING — still in progress; never presented as success.
  return (
    <Card>
      <CardContent className="text-center">
        <Clock className="mx-auto h-12 w-12 animate-pulse text-[var(--color-blue-500)]" aria-hidden="true" />
        <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Confirming your payment</h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
          This can take a moment. Please don&apos;t pay again unless you&apos;re told to.
        </p>
        <div className="mt-2">
          <AmountDisplay amountMinor={status.amount.amountMinor} currency={status.amount.currency} size="lg" />
        </div>
        <p className="mt-3 text-[length:var(--text-help)] tabular-nums text-[var(--color-neutral-500)]">Reference: {status.reference}</p>
        <Button variant="secondary" className="mt-5" onClick={onRefresh}>
          Check status again
        </Button>
        {!polling && <p className="mt-2 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Automatic checking has paused — use the button above to check again.</p>}
      </CardContent>
    </Card>
  );
}
