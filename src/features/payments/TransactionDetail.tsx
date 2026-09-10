import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { CopyButton } from '@/components/ui/CopyButton';
import { Timeline } from '@/components/data-display/Timeline';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/services/api/errors';
import { usePermission } from '@/hooks/useSession';
import { usePaymentDetail, usePaymentEvents } from './usePaymentsQueries';
import { format } from 'date-fns';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)]">{value}</dd>
    </div>
  );
}

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const paymentQuery = usePaymentDetail(id);
  const eventsQuery = usePaymentEvents(id);
  const canRequestRefund = usePermission('payments.refunds:request');

  if (paymentQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (paymentQuery.isError || !paymentQuery.data) {
    return (
      <ErrorState
        title="We couldn't load this transaction"
        message={paymentQuery.error instanceof ApiError ? paymentQuery.error.message : 'Please try again.'}
        requestId={paymentQuery.error instanceof ApiError ? paymentQuery.error.requestId : undefined}
        onRetry={() => paymentQuery.refetch()}
      />
    );
  }

  const payment = paymentQuery.data;

  return (
    <div>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: 'Transactions', to: '/transactions' }, { label: payment.reference }]} />}
        title={payment.reference}
        description={payment.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={payment.status} />
            {canRequestRefund && payment.refundableAmountMinor > 0 && (
              <Button asChild size="sm" variant="secondary">
                <Link to={`/refunds?paymentId=${payment.id}`}>Request refund</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AmountDisplay amountMinor={payment.gross.amountMinor} currency={payment.gross.currency} size="xl" />
              <div className="flex items-center gap-1 text-[length:var(--text-label)] text-[var(--color-neutral-500)]">
                {payment.reference}
                <CopyButton value={payment.reference} label="Copy reference" />
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Merchant reference" value={payment.merchantReference ?? '—'} />
              <Field label="Channel" value={payment.channel.replace(/_/g, ' ')} />
              <Field label="Provider" value={payment.providerName ?? '—'} />
              <Field label="Customer" value={payment.customer.name ?? 'Unknown'} />
              <Field label="Customer phone" value={payment.customer.phone ?? '—'} />
              <Field label="Customer email" value={payment.customer.email ?? '—'} />
              <Field label="Created" value={format(new Date(payment.createdAt), 'd MMM yyyy, HH:mm')} />
              <Field label="Last updated" value={format(new Date(payment.updatedAt), 'd MMM yyyy, HH:mm')} />
              <Field label="Expires" value={payment.expiresAt ? format(new Date(payment.expiresAt), 'd MMM yyyy, HH:mm') : '—'} />
            </dl>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--color-neutral-200)] pt-4 sm:grid-cols-4">
              <Field label="Gross" value={<AmountDisplay amountMinor={payment.gross.amountMinor} currency={payment.gross.currency} size="sm" />} />
              <Field label="Fee" value={<AmountDisplay amountMinor={payment.fee.amountMinor} currency={payment.fee.currency} size="sm" signDisplay="always" />} />
              <Field label="Tax" value={<AmountDisplay amountMinor={payment.tax.amountMinor} currency={payment.tax.currency} size="sm" />} />
              <Field label="Net" value={<AmountDisplay amountMinor={payment.net.amountMinor} currency={payment.net.currency} size="sm" />} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Reconciliation</span>
              <Badge variant={payment.reconciliationState === 'MATCHED' ? 'success' : payment.reconciliationState === 'EXCEPTION' ? 'danger' : 'neutral'}>
                {payment.reconciliationState.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Settlement</span>
              <Badge variant={payment.settlementState === 'SETTLED' ? 'success' : 'neutral'}>{payment.settlementState.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Refundable</span>
              <AmountDisplay amountMinor={payment.refundableAmountMinor} currency={payment.gross.currency} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Refunded</span>
              <AmountDisplay amountMinor={payment.refundedAmountMinor} currency={payment.gross.currency} size="sm" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="mt-4">
        <TabsList>
          <TabsTrigger value="events">Event timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <Card>
            <CardContent>
              {eventsQuery.isPending && <Skeleton className="h-40" />}
              {eventsQuery.data && (
                <Timeline
                  items={eventsQuery.data.map((e) => ({ id: e.id, label: e.label, occurredAt: e.occurredAt, detail: e.detail, tone: e.type === 'PROVIDER_RESPONSE_RECEIVED' && payment.status === 'FAILED' ? 'danger' : 'default' }))}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
