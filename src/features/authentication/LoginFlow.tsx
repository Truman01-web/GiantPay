import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { env } from '@/app/config/env';
import { LOGO_SRC } from '@/assets/brand';
import { loginSchema, type LoginFormValues } from './schemas';
import { useLoginMutation } from './useAuthMutations';
import { MfaChallengeForm } from './MfaChallengeForm';
import type { MfaChallenge } from '@/types/auth';

interface DemoAccountSummary {
  email: string;
  password: string;
  role: string;
}

function useDemoAccounts(): DemoAccountSummary[] {
  const [accounts, setAccounts] = useState<DemoAccountSummary[]>([]);
  useEffect(() => {
    if (!env.useMockApi) return;
    let cancelled = false;
    import('@/mocks/fixtures/session').then(({ DEMO_ACCOUNTS }) => {
      if (!cancelled)
        setAccounts(DEMO_ACCOUNTS.map((a) => ({ email: a.email, password: a.password, role: a.session.user.role })));
    });
    return () => { cancelled = true; };
  }, []);
  return accounts;
}

/** Labelled field block styled for the dark glassmorphism card. */
function GlassField({
  id,
  label,
  required,
  error,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-[#1B4FD8] focus:outline-none ' +
  'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

export function LoginFlow() {
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useLoginMutation();
  const demoAccounts = useDemoAccounts();

  const { register, handleSubmit, setValue, control, formState: { errors } } =
    useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const returnTo = safeRedirectPath(searchParams.get('returnTo'), '/dashboard');

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await login.mutateAsync(values);
      if (result.status === 'MFA_REQUIRED' && result.mfaChallenge) {
        setChallenge(result.mfaChallenge);
      } else {
        navigate(returnTo, { replace: true });
      }
    } catch { /* surfaced via login.error */ }
  }

  if (challenge) {
    return <MfaChallengeForm challenge={challenge} onVerified={() => navigate(returnTo, { replace: true })} />;
  }

  const errorMessage =
    login.error instanceof ApiError ? login.error.message
    : login.error ? 'We could not sign you in. Please try again.'
    : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl"
      style={{
        boxShadow: '0 24px 60px rgba(15,23,42,0.12)',
      }}
    >
      {/* Coloured top accent bar */}
      <div
        className="h-1.5 w-full rounded-t-2xl"
        style={{ background: 'linear-gradient(90deg, #1a6dcc 0%, #c9a227 50%, #c01c28 100%)' }}
      />

      <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-9">
        {/* ← Back to Home */}
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#1B4FD8] transition-colors group"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        {/* Logo — full lockup PNG centred (responsive size) */}
        <div className="mb-5 sm:mb-6 flex justify-center">
          <img
            src={LOGO_SRC}
            alt="GiantPay"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
          />
        </div>

        <h1 className="text-xl sm:text-[23px] font-bold text-slate-900 tracking-tight text-center sm:text-left">Welcome back</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 text-center sm:text-left">Sign in to your GiantPay merchant account.</p>

        {errorMessage && (
          <div className="mt-4"><Alert variant="danger">{errorMessage}</Alert></div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <GlassField id="login-email" label="Email address" required error={errors.email?.message}>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.mw"
              invalid={Boolean(errors.email)}
              className={inputCls}
              {...register('email')}
            />
          </GlassField>

          <GlassField id="login-password" label="Password" required error={errors.password?.message}>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder="••••••••"
              invalid={Boolean(errors.password)}
              className={inputCls}
              {...register('password')}
            />
          </GlassField>

          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
              <Controller
                control={control}
                name="remember"
                render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-[#1B4FD8] hover:text-blue-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            loading={login.isPending}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)',
              boxShadow: '0 4px 18px rgba(26,109,204,0.35)',
              border: 'none',
            }}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          New to GiantPay?{' '}
          <Link to="/register" className="font-semibold text-[#1B4FD8] hover:text-blue-700 transition-colors">
            Create an account
          </Link>
        </p>

        {demoAccounts.length > 0 && (
          <div
            className="mt-5 rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Sandbox demo accounts · MFA code: 123456
            </p>
            <div className="flex flex-col gap-0.5">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => { setValue('email', a.email); setValue('password', a.password); }}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-white/08 transition-colors"
                >
                  <span className="text-xs text-slate-600 truncate max-w-[200px] sm:max-w-none">{a.email}</span>
                  <span
                    className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(201,162,39,0.15)', color: '#c9a227' }}
                  >
                    {a.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
