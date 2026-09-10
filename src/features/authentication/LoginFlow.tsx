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
import { ApiError } from '@/services/api/errors';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { env } from '@/app/config/env';
import { loginSchema, type LoginFormValues } from './schemas';
import { useLoginMutation } from './useAuthMutations';
import { MfaChallengeForm } from './MfaChallengeForm';
import type { MfaChallenge } from '@/types/auth';

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

  const returnTo = safeRedirectPath(searchParams.get('returnTo'), '/dashboard');

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await login.mutateAsync(values);
      if (result.status === 'MFA_REQUIRED' && result.mfaChallenge) {
        setChallenge(result.mfaChallenge);
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch {
      // Surfaced via login.error below.
    }
  }

  if (challenge) {
    return <MfaChallengeForm challenge={challenge} onVerified={() => navigate(returnTo, { replace: true })} />;
  }

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.error
        ? 'We could not sign you in. Please try again.'
        : null;

  return (
    <Card>
      <CardContent>
        <h1 className="text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Sign in to GiantPay</h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Manage payments, links and reports.</p>

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

          <Button type="submit" loading={login.isPending} className="mt-1">
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
