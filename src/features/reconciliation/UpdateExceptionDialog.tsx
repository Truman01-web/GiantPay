import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { useUpdateException } from './useReconciliationQueries';
import { NEXT_STATUS_OPTIONS, updateExceptionSchema, type UpdateExceptionFormValues } from './schemas';
import type { ReconciliationException } from '@/types/reconciliation';

export function UpdateExceptionDialog({
  runId,
  exception,
  onOpenChange,
  onSuccess,
}: {
  runId: string;
  exception: ReconciliationException;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const options = NEXT_STATUS_OPTIONS[exception.status];
  const updateException = useUpdateException(runId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateExceptionFormValues>({
    resolver: zodResolver(updateExceptionSchema) as Resolver<UpdateExceptionFormValues>,
    defaultValues: { status: (options[0]?.value ?? 'UNDER_REVIEW') as UpdateExceptionFormValues['status'], note: '', evidenceRef: '' },
  });

  const selectedStatus = watch('status');

  async function onSubmit(values: UpdateExceptionFormValues) {
    try {
      await updateException.mutateAsync({ exceptionId: exception.id, status: values.status, note: values.note || undefined, evidenceRef: values.evidenceRef || undefined });
      onSuccess();
    } catch {
      // Surfaced via updateException.error below.
    }
  }

  const errorMessage =
    updateException.error instanceof ApiError ? updateException.error.message : updateException.error ? 'We could not update this exception.' : null;

  if (options.length === 0) {
    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent title="Update exception" description={`Reference ${exception.transactionReference}`}>
          <Alert variant="info">This exception is already resolved. No further action is available.</Alert>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent title="Update exception" description={`Reference ${exception.transactionReference}`}>
        {errorMessage && (
          <div className="mb-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="New status" required>
            {() => (
              <RadioGroup value={selectedStatus} onValueChange={(v) => setValue('status', v as UpdateExceptionFormValues['status'], { shouldValidate: true })} className="flex flex-col gap-2">
                {options.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-300)] p-3 has-[[data-state=checked]]:border-[var(--color-blue-500)] has-[[data-state=checked]]:bg-[var(--color-blue-50)]"
                  >
                    <RadioGroupItem value={opt.value} />
                    <span className="text-[length:var(--text-body)] text-[var(--color-neutral-900)]">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
          </FormField>

          <FormField
            label="Note"
            required={selectedStatus === 'RESOLVED' || selectedStatus === 'DISMISSED'}
            error={errors.note?.message}
          >
            {(fp) => <Textarea rows={3} placeholder="What did you find, or what changed?" {...fp} {...register('note')} />}
          </FormField>

          {(selectedStatus === 'RESOLVED' || selectedStatus === 'DISMISSED') && (
            <FormField label="Evidence reference" required error={errors.evidenceRef?.message}>
              {(fp) => <input className="h-10 rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] px-3" {...fp} {...register('evidenceRef')} />}
            </FormField>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateException.isPending}>
              Save update
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
