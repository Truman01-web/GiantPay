import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { CopyButton } from '@/components/ui/CopyButton';
import { ApiError } from '@/services/api/errors';
import { createPaymentLinkSchema, type CreatePaymentLinkFormValues } from './schemas';
import { useCreatePaymentLink } from './usePaymentLinksQueries';
import type { PaymentLink } from '@/types/payments';

export function CreatePaymentLinkForm() {
  const [created, setCreated] = useState<PaymentLink | null>(null);
  const navigate = useNavigate();
  const createLink = useCreatePaymentLink();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreatePaymentLinkFormValues>({
    resolver: zodResolver(createPaymentLinkSchema),
    defaultValues: { mode: 'FIXED', currency: 'MWK', reusable: false, amountMinor: null, maxSuccessfulPayments: 1 },
  });

  const mode = watch('mode');
  const reusable = watch('reusable');

  async function onSubmit(values: CreatePaymentLinkFormValues) {
    try {
      const link = await createLink.mutateAsync({
        name: values.name,
        mode: values.mode,
        amountMinor: values.mode === 'FIXED' ? (values.amountMinor ?? undefined) : undefined,
        currency: values.currency,
        description: values.description || undefined,
        customerReference: values.customerReference || undefined,
        expiresAt: values.expiresAt || undefined,
        reusable: values.reusable,
        maxSuccessfulPayments: values.reusable ? (values.maxSuccessfulPayments ?? undefined) : 1,
        redirectUrl: values.redirectUrl || undefined,
      });
      setCreated(link);
    } catch {
      // Surfaced via createLink.error below.
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--color-green-600)]" aria-hidden="true" />
            <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Payment link created</h1>
            <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Share this link to start collecting payments.</p>

            <div className="mt-5 flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-3">
              <span className="truncate text-[length:var(--text-label)] text-[var(--color-neutral-700)]">{created.url}</span>
              <CopyButton value={created.url} />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="secondary">
                <a href={created.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open checkout
                </a>
              </Button>
              <Button onClick={() => navigate(`/payment-links/${created.id}`)}>View link details</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorMessage = createLink.error instanceof ApiError ? createLink.error.message : createLink.error ? 'We could not create this link.' : null;

  return (
    <div>
      <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: 'Payment links', to: '/payment-links' }, { label: 'Create' }]} />} title="Create a payment link" />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent>
            {errorMessage && (
              <div className="mb-4">
                <Alert variant="danger">{errorMessage}</Alert>
              </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <FormField label="Link name" required help="Only visible to you and your team" error={errors.name?.message}>
                {(fp) => <Input invalid={Boolean(errors.name)} {...fp} {...register('name')} />}
              </FormField>

              <Controller
                control={control}
                name="mode"
                render={({ field }) => (
                  <fieldset>
                    <legend className="mb-1.5 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">Pricing</legend>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)]">
                        <RadioGroupItem value="FIXED" /> Fixed amount
                      </label>
                      <label className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)]">
                        <RadioGroupItem value="CUSTOMER_ENTERED" /> Customer enters amount
                      </label>
                    </RadioGroup>
                  </fieldset>
                )}
              />

              {mode === 'FIXED' && (
                <Controller
                  control={control}
                  name="amountMinor"
                  render={({ field }) => (
                    <FormField label="Amount" required error={errors.amountMinor?.message}>
                      {(fp) => <CurrencyInput currency="MWK" valueMinor={field.value} onChangeMinor={field.onChange} {...fp} />}
                    </FormField>
                  )}
                />
              )}

              <FormField label="Description" optional error={errors.description?.message}>
                {(fp) => <Textarea rows={3} {...fp} {...register('description')} />}
              </FormField>

              <FormField label="Customer reference" optional help="e.g. an invoice number" error={errors.customerReference?.message}>
                {(fp) => <Input {...fp} {...register('customerReference')} />}
              </FormField>

              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] p-4">
                <div>
                  <p className="text-[length:var(--text-body)] font-medium text-[var(--color-neutral-900)]">Reusable link</p>
                  <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Allow more than one successful payment through this link</p>
                </div>
                <Controller control={control} name="reusable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
              </div>

              {reusable && (
                <FormField label="Maximum successful payments" optional help="Leave blank for unlimited" error={errors.maxSuccessfulPayments?.message}>
                  {(fp) => (
                    <Input
                      type="number"
                      min={1}
                      {...fp}
                      {...register('maxSuccessfulPayments', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
                    />
                  )}
                </FormField>
              )}

              <FormField label="Expiry date" optional error={errors.expiresAt?.message}>
                {(fp) => <Input type="date" {...fp} {...register('expiresAt')} />}
              </FormField>

              <FormField label="Redirect URL" optional help="Where to send customers after a successful payment" error={errors.redirectUrl?.message}>
                {(fp) => <Input type="url" placeholder="https://example.mw/thank-you" invalid={Boolean(errors.redirectUrl)} {...fp} {...register('redirectUrl')} />}
              </FormField>

              <div className="flex justify-end gap-2 border-t border-[var(--color-neutral-200)] pt-4">
                <Button type="button" variant="secondary" onClick={() => navigate('/payment-links')}>
                  Cancel
                </Button>
                <Button type="submit" loading={createLink.isPending}>
                  Create link
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
