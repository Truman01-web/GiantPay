import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Input';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { LOGO_SRC, MARK_SRC } from '@/assets/brand';
import { resetPasswordSchema, type ResetPasswordFormValues } from './schemas';
import { useResetPasswordMutation } from './useAuthMutations';

const inputCls =
  'h-10 w-full rounded-lg border border-white/15 bg-white/8 px-3 text-sm text-white ' +
  'placeholder:text-white/25 focus:border-white/40 focus:bg-white/12 focus:outline-none ' +
  'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

const cardStyle: React.CSSProperties = {
  background: 'rgba(10, 28, 62, 0.58)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: '0 32px 64px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.22)',
};

const accentBar = (
  <div
    className="h-1.5 w-full rounded-t-2xl"
    style={{ background: 'linear-gradient(90deg, #1a6dcc 0%, #c9a227 50%, #c01c28 100%)' }}
  />
);

const wavingMark = (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
    <img
      src={MARK_SRC}
      alt=""
      className="animate-flag-wave-slow w-[320px] max-w-none opacity-[0.12] select-none object-contain"
      style={{ filter: 'drop-shadow(0 15px 35px rgba(201,162,39,0.25))' }}
    />
  </div>
);

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const resetPassword = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
        {wavingMark}
        {accentBar}
        <div className="relative z-10 px-8 py-10 text-center">
          {/* Warning triangle as inline SVG — avoids lucide useContext */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(192,28,40,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Invalid reset link</h1>
          <p className="mt-2 text-sm text-white/60">Request a new password reset link and try again.</p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)', boxShadow: '0 4px 18px rgba(26,109,204,0.35)' }}
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      await resetPassword.mutateAsync({ token: token!, password: values.password });
      navigate('/login', { replace: true });
    } catch {
      // Surfaced via resetPassword.error below.
    }
  }

  const errorMessage =
    resetPassword.error instanceof ApiError
      ? resetPassword.error.message
      : resetPassword.error
      ? 'We could not reset your password. Please request a new link.'
      : null;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
      {wavingMark}
      {accentBar}

      <div className="relative z-10 px-8 py-9">
        <div className="mb-6 flex justify-center">
          <img src={LOGO_SRC} alt="GiantPay" className="h-20 w-auto object-contain drop-shadow-md" />
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(26,109,204,0.2)' }}>
            {/* Key icon as inline SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">Set a new password</h1>
            <p className="text-xs text-white/50">Choose a strong password to protect your account.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4"><Alert variant="danger">{errorMessage}</Alert></div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/75">
              New password <span className="text-red-400" aria-hidden="true">*</span>
            </label>
            <PasswordInput
              autoComplete="new-password"
              placeholder="At least 10 characters"
              invalid={Boolean(errors.password)}
              className={inputCls}
              {...register('password')}
            />
            {errors.password && <p role="alert" className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/75">
              Confirm new password <span className="text-red-400" aria-hidden="true">*</span>
            </label>
            <PasswordInput
              autoComplete="new-password"
              placeholder="••••••••••"
              invalid={Boolean(errors.confirmPassword)}
              className={inputCls}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <p role="alert" className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>

          <Button
            type="submit"
            loading={resetPassword.isPending}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)',
              boxShadow: '0 4px 18px rgba(26,109,204,0.35)',
              border: 'none',
            }}
          >
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
