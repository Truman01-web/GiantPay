import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { CopyButton } from '@/components/ui/CopyButton';
import { ApiError } from '@/services/api/errors';
import { createScanToPaySchema, type CreateScanToPayFormValues } from './schemas';
import { useCreateScanToPay } from './useScanToPayQueries';
import { QrCodeDisplay } from './QrCodeDisplay';
import { QrCounterDisplay } from './QrCounterDisplay';
import type { ScanToPayCode } from '@/types/scanToPay';

export function CreateScanToPayForm() {
  const [created, setCreated] = useState<ScanToPayCode | null>(null);
  const [showCounterView, setShowCounterView] = useState(false);
  const createCode = useCreateScanToPay();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateScanToPayFormValues>({
    resolver: zodResolver(createScanToPaySchema),
    defaultValues: {
      label: '',
      currency: 'MWK',
      mode: 'FIXED',
      amountMinor: null,
      minAmountMinor: null,
      maxAmountMinor: null,
    },
  });

  const mode = watch('mode');

  async function onSubmit(values: CreateScanToPayFormValues) {
    try {
      const code = await createCode.mutateAsync({
        label: values.label,
        currency: values.currency,
        mode: values.mode,
        amountMinor: values.mode === 'FIXED' ? (values.amountMinor ?? undefined) : undefined,
        minAmountMinor: values.mode === 'CUSTOMER_ENTERED' ? (values.minAmountMinor ?? undefined) : undefined,
        maxAmountMinor: values.mode === 'CUSTOMER_ENTERED' ? (values.maxAmountMinor ?? undefined) : undefined,
        expiresAt: values.expiresAt ? `${values.expiresAt}T23:59:59.999Z` : undefined,
        maxSuccessfulPayments: values.maxSuccessfulPayments ?? undefined,
      });
      setCreated(code);
    } catch {
      // Error handled below via createCode.error
    }
  }

  if (created) {
    return (
      <div>
        <PageHeader
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: 'Scan to Pay', to: '/scan-to-pay' },
                { label: 'Created QR Code' },
              ]}
            />
          }
          title="QR Code Created"
        />

        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[var(--color-green-700)]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                <h2 className="text-[length:var(--text-h3)] font-semibold">Ready for payment</h2>
              </div>
              <p className="text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
                Customers can scan this QR code with their phone camera to pay securely.
              </p>

              <div className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-3">
                <label htmlFor="created-qr-checkout-url" className="text-[length:var(--text-help)] font-medium text-[var(--color-neutral-500)]">
                  Checkout URL
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Input id="created-qr-checkout-url" value={created.checkoutUrl} readOnly className="bg-white font-mono text-xs" />
                  <CopyButton value={created.checkoutUrl} label="Copy link" />
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowCounterView(!showCounterView)}
                >
                  {showCounterView ? 'Hide Counter Stand' : 'View Counter Stand'}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/scan-to-pay">View all QR codes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center">
              {showCounterView ? (
                <QrCounterDisplay code={created} />
              ) : (
                <QrCodeDisplay
                  url={created.checkoutUrl}
                  label={created.label}
                  size={240}
                  showActions={true}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const errorMessage =
    createCode.error instanceof ApiError
      ? createCode.error.message
      : createCode.error
        ? 'We could not create this QR code. Please try again.'
        : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Scan to Pay', to: '/scan-to-pay' },
              { label: 'Create' },
            ]}
          />
        }
        title="Create Scan to Pay QR Code"
        description="Generate a merchant QR code for customer payments at your till, counter, or print display."
      />

      <Card className="mt-4 max-w-2xl">
        <CardContent>
          {errorMessage && (
            <div className="mb-4">
              <Alert variant="danger">{errorMessage}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            <FormField label="Label / Counter Name" required error={errors.label?.message}>
              {(fp) => (
                <Input
                  {...register('label')}
                  placeholder="e.g. Till 1, Bar Counter, Invoice #1042"
                  {...fp}
                />
              )}
            </FormField>

            <fieldset>
              <legend className="mb-2 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">
                Pricing Mode
              </legend>
              <Controller
                name="mode"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label aria-label="Payment amount mode" className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-300)] p-3 has-[[data-state=checked]]:border-[var(--color-blue-500)] has-[[data-state=checked]]:bg-[var(--color-blue-50)] cursor-pointer">
                      <RadioGroupItem value="FIXED" />
                      <div>
                        <span className="block font-medium text-[length:var(--text-body)]">Fixed amount</span>
                        <span className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Preset price for goods</span>
                      </div>
                    </label>

                    <label aria-label="Customer entered amount" className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-300)] p-3 has-[[data-state=checked]]:border-[var(--color-blue-500)] has-[[data-state=checked]]:bg-[var(--color-blue-50)] cursor-pointer">
                      <RadioGroupItem value="CUSTOMER_ENTERED" />
                      <div>
                        <span className="block font-medium text-[length:var(--text-body)]">Customer entered</span>
                        <span className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Customer specifies total</span>
                      </div>
                    </label>
                  </RadioGroup>
                )}
              />
            </fieldset>

            {mode === 'FIXED' ? (
              <Controller
                name="amountMinor"
                control={control}
                render={({ field }) => (
                  <FormField label="Amount" required error={errors.amountMinor?.message}>
                    {(fp) => (
                      <CurrencyInput
                        currency="MWK"
                        valueMinor={field.value ?? null}
                        onChangeMinor={field.onChange}
                        {...fp}
                      />
                    )}
                  </FormField>
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="minAmountMinor"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Minimum Amount (optional)" error={errors.minAmountMinor?.message}>
                      {(fp) => (
                        <CurrencyInput
                          currency="MWK"
                          valueMinor={field.value ?? null}
                          onChangeMinor={field.onChange}
                          {...fp}
                        />
                      )}
                    </FormField>
                  )}
                />
                <Controller
                  name="maxAmountMinor"
                  control={control}
                  render={({ field }) => (
                    <FormField label="Maximum Amount (optional)" error={errors.maxAmountMinor?.message}>
                      {(fp) => (
                        <CurrencyInput
                          currency="MWK"
                          valueMinor={field.value ?? null}
                          onChangeMinor={field.onChange}
                          {...fp}
                        />
                      )}
                    </FormField>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Expiry Date (optional)" error={errors.expiresAt?.message}>
                {(fp) => <Input type="date" {...register('expiresAt')} {...fp} />}
              </FormField>

              <FormField
                label="Maximum Payments (optional)"
                error={errors.maxSuccessfulPayments?.message}
                help="Leave empty for unlimited payments"
              >
                {(fp) => (
                  <Input
                    type="number"
                    min={1}
                    {...register('maxSuccessfulPayments', { setValueAs: (value: string) => value === '' ? undefined : Number(value) })}
                    placeholder="e.g. 1 for single-use"
                    {...fp}
                  />
                )}
              </FormField>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-neutral-200)]">
              <Button asChild variant="secondary">
                <Link to="/scan-to-pay">Cancel</Link>
              </Button>
              <Button type="submit" loading={createCode.isPending}>
                Create QR Code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
