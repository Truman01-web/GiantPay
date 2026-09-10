import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { businessInfoSchema, type BusinessInfoFormValues } from '../schemas';
import type { BusinessInfo } from '@/types/onboarding';

export function BusinessInfoStep({ initialValues, saving, onNext }: { initialValues: Partial<BusinessInfo>; saving: boolean; onNext: (values: BusinessInfoFormValues) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      legalName: initialValues.legalName ?? '',
      tradingName: initialValues.tradingName ?? '',
      registrationNumber: initialValues.registrationNumber ?? '',
      taxId: initialValues.taxId ?? '',
      businessType: initialValues.businessType ?? '',
      industry: initialValues.industry ?? '',
      addressLine1: initialValues.addressLine1 ?? '',
      addressLine2: initialValues.addressLine2 ?? '',
      city: initialValues.city ?? '',
      postalAddress: initialValues.postalAddress ?? '',
      website: initialValues.website ?? '',
      contactName: initialValues.contactName ?? '',
      contactEmail: initialValues.contactEmail ?? '',
      contactPhone: initialValues.contactPhone ?? '',
    },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onNext)} noValidate>
      <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">Business information</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Legal business name" required error={errors.legalName?.message}>
          {(fp) => <Input invalid={Boolean(errors.legalName)} {...fp} {...register('legalName')} />}
        </FormField>
        <FormField label="Trading name" required error={errors.tradingName?.message}>
          {(fp) => <Input invalid={Boolean(errors.tradingName)} {...fp} {...register('tradingName')} />}
        </FormField>
        <FormField label="Registration number" required error={errors.registrationNumber?.message}>
          {(fp) => <Input invalid={Boolean(errors.registrationNumber)} {...fp} {...register('registrationNumber')} />}
        </FormField>
        <FormField label="Tax identifier" optional error={errors.taxId?.message}>
          {(fp) => <Input {...fp} {...register('taxId')} />}
        </FormField>
        <FormField label="Business type" required error={errors.businessType?.message}>
          {(fp) => <Input placeholder="e.g. Private Limited Company" invalid={Boolean(errors.businessType)} {...fp} {...register('businessType')} />}
        </FormField>
        <FormField label="Industry" required error={errors.industry?.message}>
          {(fp) => <Input placeholder="e.g. Retail & E-commerce" invalid={Boolean(errors.industry)} {...fp} {...register('industry')} />}
        </FormField>
      </div>

      <FormField label="Street address" required error={errors.addressLine1?.message}>
        {(fp) => <Input invalid={Boolean(errors.addressLine1)} {...fp} {...register('addressLine1')} />}
      </FormField>
      <FormField label="Address line 2" optional error={errors.addressLine2?.message}>
        {(fp) => <Input {...fp} {...register('addressLine2')} />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="City" required error={errors.city?.message}>
          {(fp) => <Input invalid={Boolean(errors.city)} {...fp} {...register('city')} />}
        </FormField>
        <FormField label="Postal address" optional error={errors.postalAddress?.message}>
          {(fp) => <Input {...fp} {...register('postalAddress')} />}
        </FormField>
      </div>

      <FormField label="Website" optional error={errors.website?.message}>
        {(fp) => <Input type="url" placeholder="https://example.mw" invalid={Boolean(errors.website)} {...fp} {...register('website')} />}
      </FormField>

      <div className="grid gap-4 border-t border-[var(--color-neutral-200)] pt-4 sm:grid-cols-2">
        <FormField label="Primary contact name" required error={errors.contactName?.message}>
          {(fp) => <Input invalid={Boolean(errors.contactName)} {...fp} {...register('contactName')} />}
        </FormField>
        <FormField label="Contact email" required error={errors.contactEmail?.message}>
          {(fp) => <Input type="email" invalid={Boolean(errors.contactEmail)} {...fp} {...register('contactEmail')} />}
        </FormField>
        <FormField label="Contact phone" required error={errors.contactPhone?.message}>
          {(fp) => <PhoneInput invalid={Boolean(errors.contactPhone)} {...fp} {...register('contactPhone')} />}
        </FormField>
      </div>

      <div className="flex justify-end border-t border-[var(--color-neutral-200)] pt-4">
        <Button type="submit" loading={saving}>
          Save & continue
        </Button>
      </div>
    </form>
  );
}
