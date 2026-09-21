import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { Logo } from '@/components/navigation/Logo';
import { ApiError } from '@/services/api/errors';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { env } from '@/app/config/env';
import { loginSchema, type LoginFormValues } from './schemas';
import { useLoginMutation } from './useAuthMutations';
import { MfaChallengeForm } from './MfaChallengeForm';
import type { MfaChallenge } from '@/types/auth';
import { useSessionStore } from '@/services/auth/sessionStore';


interface DemoAccountSummary {
  email: string;
  password: string;
  role: string;
}

/**
 * Demo credentials are only ever loaded via this dynamic import, gated on
 * mock mode — this keeps `mocks/fixtures/session.ts` (which holds plaintext
 * demo passwords) out of the production bundle entirely rather than
 * shipping it inert. See docs/frontend-security.md.
 */
function useDemoAccounts(): DemoAccountSummary[] {
  const [accounts, setAccounts] = useState<DemoAccountSummary[]>([]);

  useEffect(() => {
    if (!env.useMockApi) return;
    let cancelled = false;
    import('@/mocks/fixtures/session').then(({ DEMO_ACCOUNTS }) => {
      if (!cancelled) {
        setAccounts(DEMO_ACCOUNTS.map((a) => ({ email: a.email, password: a.password, role: a.session.user.role })));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return accounts;
}

export function LoginFlow() {
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useLoginMutation();
  const demoAccounts = useDemoAccounts();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const requestedReturnTo = searchParams.get('returnTo');
  const destinationFor = (merchantId: string | null | undefined) =>
    requestedReturnTo
      ? safeRedirectPath(requestedReturnTo, '/dashboard')
      : merchantId === null
        ? '/admin'
        : '/dashboard';

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await login.mutateAsync(values);
      if (result.status === 'MFA_REQUIRED' && result.mfaChallenge) {
        setChallenge(result.mfaChallenge);
      } else {
        navigate(destinationFor(result.session?.user.merchantId), { replace: true });
      }
    } catch {
      // Surfaced via login.error below.
    }
  }

  if (challenge) {
    return <MfaChallengeForm challenge={challenge} onVerified={() => navigate(destinationFor(useSessionStore.getState().session?.user.merchantId), { replace: true })} />;
  }

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.error
        ? 'We could not sign you in. Please try again.'
        : null;

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 sm:bg-white/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/15">
      {/* Top radiant system brand bar */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1B4FD8] via-sky-400 to-indigo-600" />

      <CardContent className="p-6 sm:p-8">
        {/* GiantPay Logo inside the form card */}
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
            Merchant &amp; Developer Portal
          </div>
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in to GiantPay</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your transactions, payment links, and live settlements.</p>
        </div>

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}


        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Email address" required error={errors.email?.message}>
            {(fieldProps) => <Input type="email" autoComplete="email" invalid={Boolean(errors.email)} {...fieldProps} {...register('email')} />}
          </FormField>

          <FormField label="Password" required error={errors.password?.message}>
            {(fieldProps) => <PasswordInput autoComplete="current-password" invalid={Boolean(errors.password)} {...fieldProps} {...register('password')} />}
          </FormField>

          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- the Checkbox is nested via Controller's render prop, which the static a11y check can't see through; it's rendered as a direct child of this label at runtime. */}
            <label className="flex items-center gap-2 text-[length:var(--text-label)] text-[var(--color-neutral-700)]">
              <Controller control={control} name="remember" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />} />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-[length:var(--text-label)] font-medium text-[var(--color-blue-600)] hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            loading={login.isPending}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-[#1B4FD8] via-blue-600 to-[#103bb0] font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            Sign in
          </Button>

        </form>

        <p className="mt-5 text-center text-[length:var(--text-label)] text-[var(--color-neutral-600)]">
          New to GiantPay?{' '}
          <Link to="/register" className="font-medium text-[var(--color-blue-600)] hover:underline">
            Create an account
          </Link>
        </p>

        {demoAccounts.length > 0 && (
          <div className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-neutral-300)] p-3">
            <p className="mb-2 text-[length:var(--text-help)] font-medium text-[var(--color-neutral-500)]">
              Sandbox demo accounts (MFA code: 123456)
            </p>
            <div className="flex flex-col gap-1">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setValue('email', a.email);
                    setValue('password', a.password);
                  }}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[length:var(--text-help)] hover:bg-[var(--color-neutral-100)]"
                >
                  <span className="text-[var(--color-neutral-700)]">{a.email}</span>
                  <span className="text-[var(--color-neutral-500)]">{a.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
