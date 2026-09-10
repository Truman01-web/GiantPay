import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import type { SettlementConfig } from '@/types/onboarding';

type DestinationType = SettlementConfig['destinationType'];

export function SettlementStep({
  initialValues,
  saving,
  onBack,
  onNext,
}: {
  initialValues: Partial<SettlementConfig>;
  saving: boolean;
  onBack: () => void;
  onNext: (values: { destinationType: DestinationType; bankName: string; accountNumber: string; mobileNumber: string }) => void;
}) {
  const [destinationType, setDestinationType] = useState<DestinationType>(initialValues.destinationType ?? 'BANK_ACCOUNT');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [touched, setTouched] = useState(false);

  const isValid = destinationType === 'BANK_ACCOUNT' ? bankName.trim() && accountNumber.trim() : mobileNumber.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onNext({ destinationType, bankName, accountNumber, mobileNumber });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">Settlement configuration</h2>
      <p className="text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Where should GiantPay send your settlement funds?</p>

      {touched && !isValid && <Alert variant="danger">Complete the settlement destination details before continuing.</Alert>}

      <fieldset>
        <legend className="mb-2 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">Destination type</legend>
        <RadioGroup value={destinationType} onValueChange={(v) => setDestinationType(v as DestinationType)} className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)]">
            <RadioGroupItem value="BANK_ACCOUNT" /> Bank account
          </label>
          <label className="flex items-center gap-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)]">
            <RadioGroupItem value="MOBILE_MONEY" /> Mobile money account
          </label>
        </RadioGroup>
      </fieldset>

      {destinationType === 'BANK_ACCOUNT' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Bank name" required error={touched && !bankName ? 'Required' : undefined}>
            {(fp) => <Input value={bankName} onChange={(e) => setBankName(e.target.value)} {...fp} />}
          </FormField>
          <FormField label="Account number" required error={touched && !accountNumber ? 'Required' : undefined}>
            {(fp) => <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} {...fp} />}
          </FormField>
        </div>
      ) : (
        <FormField label="Mobile money number" required error={touched && !mobileNumber ? 'Required' : undefined}>
          {(fp) => <PhoneInput value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} {...fp} />}
        </FormField>
      )}

      <div className="flex justify-between border-t border-[var(--color-neutral-200)] pt-4">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" loading={saving}>
          Save & continue
        </Button>
      </div>
    </form>
  );
}
