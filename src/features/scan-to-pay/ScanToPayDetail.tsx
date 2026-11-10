import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Ban, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CopyButton } from '@/components/ui/CopyButton';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import {
  useScanToPayDetail,
  useDisableScanToPay,
  useScanToPayPayments,
} from './useScanToPayQueries';
import { QrCodeDisplay } from './QrCodeDisplay';
import { QrCounterDisplay } from './QrCounterDisplay';
import type { QrPaymentItem } from '@/types/scanToPay';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-navy-900)] font-medium">
        {value}
      </dd>
    </div>
  );
}

export function ScanToPayDetail() {
  const { id } = useParams<{ id: string }>();
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [showCounterView, setShowCounterView] = useState(false);
  const [paymentsPage] = useState(1);

  const query = useScanToPayDetail(id);
  const disableCode = useDisableScanToPay();
  const paymentsQuery = useScanToPayPayments(id, { page: paymentsPage, pageSize: 10 });
  const canManage = usePermission('payments.links:manage');

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="We couldn't load this QR code"
        message={query.error instanceof ApiError ? query.error.message : 'Please try again.'}
        onRetry={() => query.refetch()}
      />
    );
  }

  const code = query.data;

  const paymentColumns: DataTableColumn<QrPaymentItem>[] = [
    {
      id: 'ref',
      header: 'Reference',
      cell: (p: QrPaymentItem) => <span className="font-mono text-xs">{p.reference}</span>,
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (p: QrPaymentItem) => p.customerName ?? '—',
    },
    {
      id: 'amount',
      header: 'Amount',
      numeric: true,
      cell: (p: QrPaymentItem) => <AmountDisplay amountMinor={p.amountMinor} currency={p.currency} size="sm" />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (p: QrPaymentItem) => <StatusBadge status={p.status} />,
    },
    {
      id: 'date',
      header: 'Date',
      cell: (p: QrPaymentItem) => format(new Date(p.createdAt), 'd MMM yyyy, HH:mm'),
    },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Scan to Pay', to: '/scan-to-pay' },
              { label: code.label },
            ]}
          />
        }
        title={code.label}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={code.status} />
            {canManage && code.status === 'ACTIVE' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDisable(true)}
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                Revoke QR code
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 mt-4">
        {/* Left Column: Metadata & Controls */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent>
              <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)] mb-4">
                QR Code Details
              </h2>

              <dl className="grid grid-cols-2 gap-4">
                <Field
                  label="Mode"
                  value={code.mode === 'FIXED' ? 'Fixed amount' : 'Customer entered'}
                />
                <Field
                  label="Amount"
                  value={
                    code.amountMinor != null ? (
                      <AmountDisplay amountMinor={code.amountMinor} currency={code.currency} size="md" />
                    ) : (
                      'Customer specified'
                    )
                  }
                />
                <Field
                  label="Successful payments"
                  value={code.successfulPaymentsCount}
                />
                <Field
                  label="Max payments"
                  value={code.maxSuccessfulPayments ?? 'Unlimited'}
                />
                <Field
                  label="Created"
                  value={format(new Date(code.createdAt), 'd MMM yyyy')}
                />
                <Field
                  label="Expires"
                  value={code.expiresAt ? format(new Date(code.expiresAt), 'd MMM yyyy') : 'Never'}
                />
              </dl>

              <div className="mt-6 border-t border-[var(--color-neutral-200)] pt-4">
                <label htmlFor="qr-checkout-url" className="text-[length:var(--text-help)] font-medium text-[var(--color-neutral-500)]">
                  Customer Checkout URL
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Input id="qr-checkout-url" value={code.checkoutUrl} readOnly className="bg-white font-mono text-xs" />
                  <CopyButton value={code.checkoutUrl} label="Copy link" />
                  <Button asChild variant="outline" size="sm">
                    <a href={code.checkoutUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCounterView(!showCounterView)}
                >
                  {showCounterView ? 'Standard QR View' : 'Counter Stand View'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payments List Card */}
          <Card>
            <CardContent>
              <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)] mb-3">
                Payments Received
              </h2>
              <DataTable
                caption="QR code payments"
                columns={paymentColumns}
                data={paymentsQuery.data?.data ?? []}
                getRowKey={(p: QrPaymentItem) => p.id}
                loading={paymentsQuery.isPending}
                emptyTitle="No payments yet"
                emptyDescription="Payments will appear here once customers scan and complete payment."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: QR or Counter Display */}
        <div>
          <Card>
            <CardContent className="flex flex-col items-center">
              {showCounterView ? (
                <QrCounterDisplay code={code} />
              ) : (
                <QrCodeDisplay
                  url={code.checkoutUrl}
                  label={code.label}
                  size={260}
                  showActions={code.status === 'ACTIVE'}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Revoke this QR code?"
        description="Customers who scan this QR code will no longer be able to submit payments. This action cannot be undone."
        confirmLabel="Revoke QR code"
        destructive
        loading={disableCode.isPending}
        onConfirm={async () => {
          await disableCode.mutateAsync(code.id);
          setConfirmDisable(false);
        }}
      />
    </div>
  );
}
