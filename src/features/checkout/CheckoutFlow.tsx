import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { FormField } from '@/components/forms/FormField';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Alert } from '@/components/feedback/Alert';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ApiError } from '@/services/api/errors';
import { useCheckoutSession, useSubmitCheckout } from './useCheckoutQueries';
import { usePaymentStatusPolling } from './usePaymentStatusPolling';
import { PaymentResult } from './PaymentResult';
import type { PaymentChannel } from '@/types/payments';

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  MOBILE_MONEY: 'Mobile money',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
};

export function CheckoutFlow() {
  const { token } = useParams<{ token: string }>();
  const sessionQuery = useCheckoutSession(token);
  const submit = useSubmitCheckout(token);

  const [channel, setChannel] = useState<PaymentChannel | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const polled = usePaymentStatusPolling(submittedReference ?? undefined);

  if (sessionQuery.isPending) return <FullPageLoader label="Loading your payment…" />;

  if (sessionQuery.isError || !sessionQuery.data) {
    const notFound = sessionQuery.error instanceof ApiError && sessionQuery.error.isNotFound;
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">
            {notFound ? 'This payment link is invalid' : 'We could not load this payment'}
          </h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            {notFound ? 'Check the link and try again, or ask the merchant for a new one.' : 'Please try again in a moment.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const session = sessionQuery.data;

  if (session.status === 'EXPIRED') {
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">This payment session expired</h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Ask {session.merchantDisplayName} for a new payment link.</p>
        </CardContent>
      </Card>
    );
  }

  // Once submitted, the ONLY thing rendered is the trusted, backend-polled
  // status — never an optimistic "paid" state derived from the submit call.
  if (submittedReference) {
    if (polled.status) {
      return <PaymentResult status={polled.status} polling={polled.polling} onRefresh={polled.refresh} />;
    }
    return <FullPageLoader label="Checking payment status…" />;
  }

  const needsName = session.requiredCustomerFields.includes('name');
  const needsPhone = session.requiredCustomerFields.includes('phone');
  const needsEmail = session.requiredCustomerFields.includes('email');

  const missingRequired = (needsName && !name) || (needsPhone && !phone) || (needsEmail && !email) || !channel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (missingRequired || !channel) return;
    try {
      const result = await submit.mutateAsync({ channel, customer: { name: name || undefined, phone: phone || undefined, email: email || undefined } });
      setSubmittedReference(result.reference);
    } catch {
      // Surfaced via submit.error below.
    }
  }

  const errorMessage = submit.error instanceof ApiError ? submit.error.message : submit.error ? 'We could not start this payment. Please try again.' : null;

  return (
    <Card>
      <CardContent>
        <p className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Paying {session.merchantDisplayName}</p>
        {session.description && <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-700)]">{session.description}</p>}
        <div className="mt-3">
          <AmountDisplay amountMinor={session.amount.amountMinor} currency={session.amount.currency} size="xl" />
        </div>
        {session.merchantReference && <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Ref: {session.merchantReference}</p>}

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <fieldset>
            <legend className="mb-2 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">Payment method</legend>
            <RadioGroup value={channel ?? ''} onValueChange={(v) => setChannel(v as PaymentChannel)} className="flex flex-col gap-2">
              {session.availableChannels.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-300)] p-3 has-[[data-state=checked]]:border-[var(--color-blue-500)] has-[[data-state=checked]]:bg-[var(--color-blue-50)]"
                >
                  <RadioGroupItem value={c} />
                  <span className="text-[length:var(--text-body)] text-[var(--color-neutral-900)]">{CHANNEL_LABELS[c]}</span>
                </label>
              ))}
            </RadioGroup>
            {touched && !channel && <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-red-600)]">Select a payment method</p>}
          </fieldset>

          {needsName && (
            <FormField label="Full name" required error={touched && !name ? 'Enter your name' : undefined}>
              {(fp) => <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" {...fp} />}
            </FormField>
          )}
          {needsPhone && (
            <FormField label="Phone number" required error={touched && !phone ? 'Enter your phone number' : undefined}>
              {(fp) => <PhoneInput value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" {...fp} />}
            </FormField>
          )}
          {needsEmail && (
            <FormField label="Email address" required error={touched && !email ? 'Enter your email address' : undefined}>
              {(fp) => <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" {...fp} />}
            </FormField>
          )}

          <Button type="submit" size="lg" loading={submit.isPending} className="mt-2">
            Pay <AmountDisplay amountMinor={session.amount.amountMinor} currency={session.amount.currency} className="text-white" size="md" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
