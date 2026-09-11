import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LOGO_SRC, MARK_SRC } from '@/assets/brand';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './schemas';
import { useForgotPasswordMutation } from './useAuthMutations';

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

function WavingMark() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
      <img
        src={MARK_SRC}
        alt=""
        className="animate-flag-wave-slow w-[320px] max-w-none opacity-[0.12] select-none object-contain"
        style={{ filter: 'drop-shadow(0 15px 35px rgba(201,162,39,0.25))' }}
      />
    </div>
  );
}

function AccentBar() {
  return (
    <div
      className="h-1.5 w-full rounded-t-2xl"
      style={{ background: 'linear-gradient(90deg, #1a6dcc 0%, #c9a227 50%, #c01c28 100%)' }}
    />
  );
}

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordFormValues) {
    await forgotPassword.mutateAsync(values);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
        <WavingMark />
        <AccentBar />
        <div className="relative z-10 px-8 py-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(26,109,204,0.2)' }}>
            <Mail className="h-8 w-8 text-blue-400" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Check your email</h1>
          {/* Deliberately does not confirm whether the account exists. */}
          <p className="mt-2 text-sm text-white/60">
            If an account exists for that address, we&apos;ve sent instructions to reset your password.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)', boxShadow: '0 4px 18px rgba(26,109,204,0.35)' }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
      <WavingMark />
      <AccentBar />

      <div className="relative z-10 px-8 py-9">
        <div className="mb-6 flex justify-center">
          <img src={LOGO_SRC} alt="GiantPay" className="h-20 w-auto object-contain drop-shadow-md" />
        </div>

        <h1 className="text-[22px] font-bold text-white tracking-tight text-center sm:text-left">Reset your password</h1>
        <p className="mt-1 text-sm text-white/60 text-center sm:text-left">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/75">
              Email address <span className="text-red-400" aria-hidden="true">*</span>
            </label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@company.mw"
              invalid={Boolean(errors.email)}
              className={inputCls}
              {...register('email')}
            />
            {errors.email && <p role="alert" className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            loading={forgotPassword.isPending}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)',
              boxShadow: '0 4px 18px rgba(26,109,204,0.35)',
              border: 'none',
            }}
          >
            Send reset link
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-white/45">
          <Link to="/login" className="font-semibold text-[#c9a227] hover:text-[#e0b83a] transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
