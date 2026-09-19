import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import type { RegistrationResult } from '@/services/api/auth';
import { normalizeMalawiPhone } from '@/lib/phone';
import { registerSchema, type RegisterFormValues } from './schemas';
import {
  useRegisterMutation,
  useRegistrationOtpResendMutation,
  useRegistrationOtpVerifyMutation,
} from './useAuthMutations';

export function RegisterForm() {
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');
  const [retrySeconds, setRetrySeconds] = useState(0);
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
    if (retrySeconds <= 0) return;
    const timer = window.setInterval(
      () => setRetrySeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [retrySeconds]);

  if (verified)
    return (
      <Card className="rounded-2xl shadow-xl shadow-slate-900/10">
        <CardContent className="text-center">
          <CheckCircle2
            className="mx-auto h-10 w-10 text-[var(--color-green-600)]"
            aria-hidden="true"
          />
          <h1 className="mt-3 text-[length:var(--text-h2)] font-extrabold text-[var(--color-navy-900)]">
            Email verified
          </h1>
          <p className="mt-1 text-[var(--color-neutral-600)]">
            Your sandbox registration is complete. You can now sign in.
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
          {deliveryConfirmed ? (
            <>
              <p className="mt-2 text-[var(--color-neutral-600)]">
                Enter the six-digit code queued for {registration.maskedDestination}. It expires in
                10 minutes.
              </p>
              {error && (
                <div className="mt-4" role="alert">
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}
              <form
                className="mt-5 space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!registration.challengeId || verifyOtp.isPending || !/^\d{6}$/.test(code))
                    return;
                  try {
                    await verifyOtp.mutateAsync({ challengeId: registration.challengeId, code });
                    setVerified(true);
                  } catch (error) {
                    void error;
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
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                disabled={retrySeconds > 0 || resendOtp.isPending}
                loading={resendOtp.isPending}
                onClick={async () => {
                  if (!registration.challengeId) return;
                  try {
                    const next = await resendOtp.mutateAsync({
                      challengeId: registration.challengeId,
                    });
                    setRegistration(next);
                    setCode('');
                    setRetrySeconds(next.resendAvailableAt ? 60 : 0);
                  } catch (error) {
                    void error;
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

  const error =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : registerMutation.error
        ? 'Registration failed. Please try again.'
        : null;
  return (
    <Card className="rounded-2xl shadow-xl shadow-slate-900/10">
      <CardContent>
        <h1 className="text-[length:var(--text-h2)] font-extrabold tracking-tight text-[var(--color-navy-900)]">
          Create your GiantPay account
        </h1>
        <p className="mt-1 text-[var(--color-neutral-600)]">
          Create an account for the GiantPay sandbox. This does not activate production services.
        </p>
        {error && (
          <div className="mt-4" role="alert">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              const result = await registerMutation.mutateAsync({
                ...values,
                phone: normalizeMalawiPhone(values.phone),
              });
              setRegistration(result);
              setRetrySeconds(result.resendAvailableAt ? 60 : 0);
            } catch (error) {
              void error;
            }
          })}
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
          <Button type="submit" loading={registerMutation.isPending} className="mt-1 rounded-xl">
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-[var(--color-neutral-600)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--color-blue-600)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
