import { useForm, Controller, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { FormField } from '@/components/forms/FormField';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Alert } from '@/components/feedback/Alert';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ApiError } from '@/services/api/errors';
import { usePaymentDetail } from '@/features/payments/usePaymentsQueries';
import { refundRequestSchema, type RefundRequestFormValues } from './schemas';
import { useCreateRefund } from './useRefundsQueries';

export function RequestRefundDialog({ paymentId, onOpenChange, onSuccess }: { paymentId: string; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const paymentQuery = usePaymentDetail(paymentId);
  const createRefund = useCreateRefund();

  const refundableAmountMinor = paymentQuery.data?.refundableAmountMinor ?? 0;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RefundRequestFormValues>({
    resolver: zodResolver(refundRequestSchema(refundableAmountMinor)),
    values: { amountMinor: refundableAmountMinor, reason: '' },
  });

  async function onSubmit(values: RefundRequestFormValues) {
    if (!paymentQuery.data) return;
    try {
      await createRefund.mutateAsync({ paymentId, amountMinor: values.amountMinor, reason: values.reason });
      onSuccess();
    } catch {
      // Surfaced via createRefund.error below.
    }
  }

  const errorMessage = createRefund.error instanceof ApiError ? createRefund.error.message : createRefund.error ? 'We could not submit this refund request.' : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent title="Request a refund" description={paymentQuery.data ? `For payment ${paymentQuery.data.reference}` : undefined}>
        {paymentQuery.isPending && <Skeleton className="h-48" />}

        {paymentQuery.data && (
          <>
            {errorMessage && (
              <div className="mb-4">
                <Alert variant="danger">{errorMessage}</Alert>
              </div>
            )}

            <dl className="mb-4 grid grid-cols-2 gap-3 rounded-[var(--radius-md)] bg-[var(--color-neutral-50)] p-3">
              <div>
                <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Original amount</dt>
                <dd><AmountDisplay amountMinor={paymentQuery.data.gross.amountMinor} currency={paymentQuery.data.gross.currency} size="sm" /></dd>
              </div>
              <div>
                <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Refunded to date</dt>
                <dd><AmountDisplay amountMinor={paymentQuery.data.refundedAmountMinor} currency={paymentQuery.data.gross.currency} size="sm" /></dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Refundable amount (backend-confirmed)</dt>
                <dd><AmountDisplay amountMinor={refundableAmountMinor} currency={paymentQuery.data.gross.currency} size="md" /></dd>
              </div>
            </dl>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <FormField label="Refund amount" required error={errors.amountMinor?.message}>
                {(fp) => (
                  <CurrencyInputControlled name="amountMinor" control={control} currency={paymentQuery.data!.gross.currency} fieldProps={fp} />
                )}
              </FormField>
              <FormField label="Reason" required error={errors.reason?.message}>
                {(fp) => <Textarea rows={3} {...fp} {...register('reason')} />}
              </FormField>

              <Alert variant="warning">
                This will {refundableAmountMinor === 0 ? '' : 'partially or fully '}refund the customer and cannot be undone once processed.
                {' '}Approval may be required before this takes effect.
              </Alert>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={createRefund.isPending}>
                  Submit refund request
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Small local adapter so CurrencyInput (minor-unit controlled component)
// plugs into React Hook Form via Controller.
function CurrencyInputControlled({
  name,
  control,
  currency,
  fieldProps,
}: {
  name: 'amountMinor';
  control: Control<RefundRequestFormValues>;
  currency: string;
  fieldProps: Record<string, unknown>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <CurrencyInput currency={currency} valueMinor={field.value} onChangeMinor={(v) => field.onChange(v ?? 0)} {...fieldProps} />}
    />
  );
}
