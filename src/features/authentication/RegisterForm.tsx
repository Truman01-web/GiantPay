import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/navigation/Logo';
import { ApiError } from '@/services/api/errors';
import type { RegistrationResult } from '@/services/api/auth';
import { normalizeMalawiPhone } from '@/lib/phone';
import { registerSchema, type RegisterFormValues } from './schemas';
import {
  useRegisterMutation,
  useRegistrationOtpResendMutation,
  useRegistrationOtpVerifyMutation,
} from './useAuthMutations';

function secondsUntil(value?: string): number {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

const RECOVERY_KEY = 'giantpay.registration.verification';
function loadRegistrationRecovery(): RegistrationResult | null {
  try {
    const value = sessionStorage.getItem(RECOVERY_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as RegistrationResult;
    return parsed.accepted && parsed.challengeId && parsed.delivery ? parsed : null;
  } catch {
    return null;
  }
}

export function RegisterForm() {
  const [registration, setRegistration] = useState<RegistrationResult | null>(
    loadRegistrationRecovery,
  );
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(() =>
    secondsUntil(registration?.resendAvailableAt),
  );
  const registerMutation = useRegisterMutation();
  const verifyOtp = useRegistrationOtpVerifyMutation();
  const resendOtp = useRegistrationOtpResendMutation();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  useEffect(() => {
    if (registration?.challengeId)
      sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(registration));
    else sessionStorage.removeItem(RECOVERY_KEY);
  }, [registration]);

  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = window.setTimeout(
      () => setRetrySeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  if (verified)
    return (
      <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 sm:bg-white/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/15">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1B4FD8] via-emerald-400 to-teal-600" />
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo variant="full" />
          </div>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
            Email verified
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your email address is verified. You can now sign in and continue to your merchant
            dashboard.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block font-medium text-[var(--color-blue-600)] hover:underline"
          >
            Sign in
          </Link>
        </CardContent>
      </Card>
    );

  if (registration) {
    const deliveryConfirmed = Boolean(
      registration.delivery.available && registration.delivery.queued && registration.challengeId,
    );
    const error =
      verifyOtp.error instanceof ApiError
        ? verifyOtp.error.message
        : resendOtp.error instanceof ApiError
          ? resendOtp.error.message
          : null;
    return (
      <Card className="rounded-2xl shadow-xl shadow-slate-900/10">
        <CardContent>
          <h1 className="text-[length:var(--text-h2)] font-extrabold text-[var(--color-navy-900)]">
            Verify your email
          </h1>
          {registration.challengeId ? (
            <>
              {deliveryConfirmed ? (
                <p className="mt-2 text-[var(--color-neutral-600)]">
                  Enter the six-digit code sent to {registration.maskedDestination}. It expires in
                  10 minutes.
                </p>
              ) : (
                <div className="mt-4">
                  <Alert variant="warning">
                    {registration.delivery.available
                      ? `We could not send a code to ${registration.maskedDestination ?? 'your email'}. Check the address and try again after the cooldown.`
                      : 'Email delivery is currently unavailable. No verification code was sent. You can retry after delivery is configured.'}
                  </Alert>
                </div>
              )}
              {error && (
                <div className="mt-4">
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}
              {deliveryConfirmed && (
                <form
                  className="mt-5 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    if (
                      !registration.challengeId ||
                      form.dataset.submitting ||
                      !/^\d{6}$/.test(code)
                    )
                      return;
                    form.dataset.submitting = 'true';
                    try {
                      await verifyOtp.mutateAsync({ challengeId: registration.challengeId, code });
                      sessionStorage.removeItem(RECOVERY_KEY);
                      setVerified(true);
                    } catch (error) {
                      void error;
                    } finally {
                      delete form.dataset.submitting;
                    }
                  }}
                >
                  <FormField
                    label="Verification code"
                    required
                    help="Six digits from the registration email"
                  >
                    {(fp) => (
                      <Input
                        {...fp}
                        value={code}
                        onChange={(event) =>
                          setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                      />
                    )}
                  </FormField>
                  <Button type="submit" loading={verifyOtp.isPending} disabled={code.length !== 6}>
                    Verify email
                  </Button>
                </form>
              )}
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                disabled={retrySeconds > 0 || resendOtp.isPending}
                loading={resendOtp.isPending}
                onClick={async (event) => {
                  const button = event.currentTarget;
                  if (!registration.challengeId || button.dataset.submitting) return;
                  button.dataset.submitting = 'true';
                  try {
                    const next = await resendOtp.mutateAsync({
                      challengeId: registration.challengeId,
                    });
                    setRegistration(next);
                    setCode('');
                    setRetrySeconds(secondsUntil(next.resendAvailableAt));
                  } catch (error) {
                    void error;
                  } finally {
                    delete button.dataset.submitting;
                  }
                }}
              >
                {retrySeconds > 0
                  ? `Request another code in ${retrySeconds}s`
                  : 'Request another code'}
              </Button>
            </>
          ) : (
            <div className="mt-4">
              <Alert variant="warning">
                Registration was accepted, but external email delivery is not enabled in this
                sandbox. No verification code was sent.
              </Alert>
            </div>
          )}
          <button
            type="button"
            className="mt-5 font-medium text-[var(--color-blue-600)] hover:underline focus-visible:outline-2"
            onClick={() => {
              setRegistration(null);
              registerMutation.reset();
              verifyOtp.reset();
              resendOtp.reset();
              setCode('');
            }}
          >
            Change email address
          </button>
        </CardContent>
      </Card>
    );
  }

  const errorMessage =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : registerMutation.error
        ? 'Registration failed. Please try again.'
        : null;

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 sm:bg-white/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/15">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1B4FD8] via-sky-400 to-indigo-600" />
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <Link
            to="/"
            className="group flex flex-col items-center gap-2 rounded-xl p-1 transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-blue-500"
            aria-label="GiantPay Home"
          >
            <Logo variant="full" />
          </Link>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/80 px-3 py-0.5 text-[11px] font-semibold text-[#1B4FD8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B4FD8] animate-pulse" />
            Instant Sandbox Setup
          </div>
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Create your GiantPay account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Start with sandbox access — production activates after review.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            if (form.dataset.submitting) return;
            form.dataset.submitting = 'true';
            void handleSubmit(async (values) => {
              try {
                const result = await registerMutation.mutateAsync({
                  ...values,
                  phone: normalizeMalawiPhone(values.phone),
                });
                setRegistration(result);
                setRetrySeconds(secondsUntil(result.resendAvailableAt));
              } catch (error) {
                void error;
              }
            })(event).finally(() => {
              delete form.dataset.submitting;
            });
          }}
          noValidate
        >
          <FormField label="Business name" required error={errors.businessName?.message}>
            {(fp) => (
              <Input invalid={Boolean(errors.businessName)} {...fp} {...register('businessName')} />
            )}
          </FormField>
          <FormField label="Work email" required error={errors.email?.message}>
            {(fp) => (
              <Input
                type="email"
                autoComplete="email"
                invalid={Boolean(errors.email)}
                {...fp}
                {...register('email')}
              />
            )}
          </FormField>
          <FormField
            label="Phone number"
            required
            help="Malawi numbers, e.g. +265 991 234 567"
            error={errors.phone?.message}
          >
            {(fp) => <PhoneInput invalid={Boolean(errors.phone)} {...fp} {...register('phone')} />}
          </FormField>
          <FormField
            label="Password"
            required
            help="At least 12 characters"
            error={errors.password?.message}
          >
            {(fp) => (
              <PasswordInput
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
                {...fp}
                {...register('password')}
              />
            )}
          </FormField>
          <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
            {(fp) => (
              <PasswordInput
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
                {...fp}
                {...register('confirmPassword')}
              />
            )}
          </FormField>

          <label className="flex items-start gap-2 text-[length:var(--text-label)] text-[var(--color-neutral-700)]">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="text-[var(--color-blue-600)] hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-[var(--color-blue-600)] hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-[length:var(--text-help)] text-[var(--color-red-600)]">
              {errors.acceptTerms.message}
            </p>
          )}

          <Button
            type="submit"
            loading={registerMutation.isPending}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-[#1B4FD8] via-blue-600 to-[#103bb0] font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-[length:var(--text-label)] text-[var(--color-neutral-600)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--color-blue-600)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
