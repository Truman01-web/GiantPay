import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { FormField } from '@/components/forms/FormField';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { Alert } from '@/components/feedback/Alert';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ApiError } from '@/services/api/errors';
import { useQrCheckoutInfo, useSubmitQrCheckout } from './useScanToPayQueries';
import { usePaymentStatusPolling } from '@/features/checkout/usePaymentStatusPolling';
import { PaymentResult } from '@/features/checkout/PaymentResult';
import type { PaymentChannel } from '@/types/payments';

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  MOBILE_MONEY: 'Mobile Money (Airtel / Mpamba)',
  CARD: 'Card (Visa / Mastercard)',
  BANK_TRANSFER: 'Bank Transfer',
};

export function QrCheckoutFlow() {
  const { token } = useParams<{ token: string }>();
  const qrQuery = useQrCheckoutInfo(token);
  const submit = useSubmitQrCheckout(token);

  const [channel, setChannel] = useState<PaymentChannel | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [enteredAmountMinor, setEnteredAmountMinor] = useState<number | null>(null);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [touched, setTouched] = useState(false);

  const polled = usePaymentStatusPolling(submittedReference ?? undefined);

  if (qrQuery.isPending) return <FullPageLoader label="Loading payment details…" />;

  if (qrQuery.isError || !qrQuery.data) {
    const notFound = qrQuery.error instanceof ApiError && qrQuery.error.isNotFound;
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">
            {notFound ? 'Invalid QR Checkout Link' : 'Could not load payment details'}
          </h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            {notFound
              ? 'This QR code is invalid or has been revoked. Please ask the merchant for a new QR code.'
              : 'Please check your connection and try again.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const qr = qrQuery.data;

  if (qr.status === 'EXPIRED') {
    return (
      <Card>
        <CardContent className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">
            QR Code Expired
          </h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            This QR code from {qr.merchantDisplayName} is no longer active.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isRedirecting) {
    return <FullPageLoader label="Redirecting to secure payment page…" />;
  }

  // Once submitted, the ONLY thing rendered is the trusted, backend-polled
  // status — never an optimistic "paid" state derived from the submit call.
  if (submittedReference) {
    if (polled.status) {
      return (
        <PaymentResult
          status={polled.status}
          polling={polled.polling}
          onRefresh={polled.refresh}
        />
      );
    }
    if (!polled.polling && polled.error) {
      return (
        <Card>
          <CardContent>
            <ErrorState
              title="We couldn't confirm your payment"
              message={polled.error}
              onRetry={polled.refresh}
            />
          </CardContent>
        </Card>
      );
    }
    return <FullPageLoader label="Verifying payment with bank/network…" />;
  }

  const isCustomerEntered = qr.mode === 'CUSTOMER_ENTERED';
  const effectiveAmountMinor = isCustomerEntered ? enteredAmountMinor : qr.amountMinor;

  const isAmountValid =
    !isCustomerEntered ||
    (enteredAmountMinor != null &&
      enteredAmountMinor > 0 &&
      (qr.minAmountMinor == null || enteredAmountMinor >= qr.minAmountMinor) &&
      (qr.maxAmountMinor == null || enteredAmountMinor <= qr.maxAmountMinor));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!channel || !isAmountValid) return;

    try {
      const result = await submit.mutateAsync({
        channel,
        requestedAmountMinor: isCustomerEntered ? (enteredAmountMinor ?? undefined) : undefined,
        customer: {
          name: name || undefined,
          phone: phone || undefined,
          email: email || undefined,
        },
      });

      if (result.checkoutUrl) {
        setIsRedirecting(true);
        window.location.assign(result.checkoutUrl);
        return;
      }

      setSubmittedReference(result.reference);
    } catch {
      // Surfaced via submit.error below
    }
  }

  const errorMessage =
    submit.error instanceof ApiError
      ? submit.error.message
      : submit.error
        ? 'We could not initiate this payment. Please try again.'
        : null;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 text-[var(--color-neutral-500)] mb-1">
          <QrCode className="h-4 w-4" aria-hidden="true" />
          <span className="text-[length:var(--text-label)]">Scan to Pay</span>
        </div>

        <h1 className="text-[length:var(--text-h2)] font-bold text-[var(--color-navy-900)]">
          {qr.merchantDisplayName}
        </h1>
        <p className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
          {qr.label}
        </p>

        {/* Display Amount */}
        {!isCustomerEntered && qr.amountMinor != null && (
          <div className="mt-4 rounded-[var(--radius-lg)] bg-[var(--color-blue-50)] p-4 text-center">
            <span className="text-[length:var(--text-help)] text-[var(--color-neutral-600)] font-medium uppercase tracking-wider">
              Total to pay
            </span>
            <div className="mt-1">
              <AmountDisplay
                amountMinor={qr.amountMinor}
                currency={qr.currency}
                size="xl"
                className="text-[var(--color-navy-900)] font-bold"
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          {/* Amount Input for Customer-Entered Mode */}
          {isCustomerEntered && (
            <div>
              <FormField
                label="Amount to pay"
                required
                error={
                  touched && !isAmountValid
                    ? qr.minAmountMinor != null && (enteredAmountMinor ?? 0) < qr.minAmountMinor
                      ? `Minimum amount is ${qr.currency} ${(qr.minAmountMinor / 100).toFixed(2)}`
                      : qr.maxAmountMinor != null && (enteredAmountMinor ?? 0) > qr.maxAmountMinor
                        ? `Maximum amount is ${qr.currency} ${(qr.maxAmountMinor / 100).toFixed(2)}`
                        : 'Enter an amount to pay'
                    : undefined
                }
              >
                {(fp) => (
                  <CurrencyInput
                    currency={qr.currency}
                    valueMinor={enteredAmountMinor}
                    onChangeMinor={(val: number | null) => setEnteredAmountMinor(val)}
                    {...fp}
                  />
                )}
              </FormField>
              {qr.minAmountMinor != null && (
                <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
                  Min: <AmountDisplay amountMinor={qr.minAmountMinor} currency={qr.currency} size="sm" />
                  {qr.maxAmountMinor != null && (
                    <>
                      {' · '}Max:{' '}
                      <AmountDisplay amountMinor={qr.maxAmountMinor} currency={qr.currency} size="sm" />
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Payment Method Selector */}
          <fieldset>
            <legend className="mb-2 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">
              Payment method
            </legend>
            <RadioGroup
              value={channel ?? ''}
              onValueChange={(v) => setChannel(v as PaymentChannel)}
              className="flex flex-col gap-2"
            >
              {qr.availableChannels.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-300)] p-3 has-[[data-state=checked]]:border-[var(--color-blue-500)] has-[[data-state=checked]]:bg-[var(--color-blue-50)] cursor-pointer"
                >
                  <RadioGroupItem value={c} />
                  <span className="text-[length:var(--text-body)] text-[var(--color-neutral-900)]">
                    {CHANNEL_LABELS[c]}
                  </span>
                </label>
              ))}
            </RadioGroup>
            {touched && !channel && (
              <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-red-600)]">
                Select a payment method
              </p>
            )}
          </fieldset>

          {/* Customer Details */}
          <div className="flex flex-col gap-3">
            <FormField label="Your Name (optional)">
              {(fp) => (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="e.g. John Banda"
                  {...fp}
                />
              )}
            </FormField>

            <FormField label="Phone Number (for payment prompt)">
              {(fp) => (
                <PhoneInput
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  {...fp}
                />
              )}
            </FormField>

            <FormField label="Email Receipt (optional)">
              {(fp) => (
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...fp}
                />
              )}
            </FormField>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={submit.isPending}
            className="mt-2"
          >
            Pay Now
            {effectiveAmountMinor != null && effectiveAmountMinor > 0 && (
              <>
                {' '}
                <AmountDisplay
                  amountMinor={effectiveAmountMinor}
                  currency={qr.currency}
                  className="text-white ml-1"
                  size="md"
                />
              </>
            )}
          </Button>

          <p className="text-center text-[length:var(--text-help)] text-[var(--color-neutral-400)]">
            Secured by GiantPay
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
