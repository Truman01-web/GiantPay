import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { LOGO_SRC, MARK_SRC } from '@/assets/brand';
import { registerSchema, type RegisterFormValues } from './schemas';
import { useRegisterMutation } from './useAuthMutations';

/** Labelled field block styled for the dark glassmorphism card. */
function GlassField({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/75">
        {label}
        {required && <span className="ml-0.5 text-red-400" aria-hidden="true">*</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-white/35">{help}</p>}
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

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

export function RegisterForm() {
  const [submitted, setSubmitted] = useState(false);
  const register_ = useRegisterMutation();
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

  async function onSubmit(values: RegisterFormValues) {
    try {
      await register_.mutateAsync(values);
      setSubmitted(true);
    } catch {
      // Surfaced via register_.error below.
    }
  }

  if (submitted) {
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
        {accentBar}
        <div className="relative z-10 px-8 py-10 text-center">
          <svg className="mx-auto h-14 w-14 text-emerald-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mt-4 text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-white/60">
            We&apos;ve sent a verification link to confirm your account. Once verified, you can sign in and start your merchant application.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)', boxShadow: '0 4px 18px rgba(26,109,204,0.35)' }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  const errorMessage = register_.error instanceof ApiError
    ? register_.error.message
    : register_.error
    ? 'Registration failed. Please try again.'
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
      {/* GP mark — centered waving watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={MARK_SRC}
          alt=""
          className="animate-flag-wave w-[280px] sm:w-[380px] md:w-[420px] max-w-none opacity-[0.14] select-none object-contain"
          style={{ filter: 'drop-shadow(0 15px 35px rgba(201,162,39,0.3))' }}
        />
      </div>

      {accentBar}

      <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-9">
        {/* Logo — centered, responsive */}
        <div className="mb-5 sm:mb-6 flex justify-center">
          <img src={LOGO_SRC} alt="GiantPay" className="h-16 sm:h-20 w-auto object-contain drop-shadow-md" />
        </div>

        <h1 className="text-xl sm:text-[22px] font-bold text-white tracking-tight text-center sm:text-left">Create your account</h1>
        <p className="mt-1 text-xs sm:text-sm text-white/60 text-center sm:text-left">Start with sandbox access — production activates after review.</p>

        {errorMessage && (
          <div className="mt-4"><Alert variant="danger">{errorMessage}</Alert></div>
        )}

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <GlassField label="Business name" required error={errors.businessName?.message}>
            <Input
              placeholder="Kamba Business Ltd"
              invalid={Boolean(errors.businessName)}
              className={inputCls}
              {...register('businessName')}
            />
          </GlassField>

          <GlassField label="Work email" required error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@company.mw"
              invalid={Boolean(errors.email)}
              className={inputCls}
              {...register('email')}
            />
          </GlassField>

          <GlassField label="Phone number" required help="Malawi numbers, e.g. +265 991 234 567" error={errors.phone?.message}>
            <PhoneInput invalid={Boolean(errors.phone)} className={inputCls} {...register('phone')} />
          </GlassField>

          <GlassField label="Password" required help="At least 10 characters" error={errors.password?.message}>
            <PasswordInput
              autoComplete="new-password"
              placeholder="••••••••••"
              invalid={Boolean(errors.password)}
              className={inputCls}
              {...register('password')}
            />
          </GlassField>

          <GlassField label="Confirm password" required error={errors.confirmPassword?.message}>
            <PasswordInput
              autoComplete="new-password"
              placeholder="••••••••••"
              invalid={Boolean(errors.confirmPassword)}
              className={inputCls}
              {...register('confirmPassword')}
            />
          </GlassField>

          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="flex items-start gap-2.5 text-sm text-white/65 cursor-pointer select-none">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => <Checkbox className="mt-0.5" checked={Boolean(field.value)} onCheckedChange={field.onChange} />}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-[#c9a227] hover:text-[#e0b83a] transition-colors">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="font-medium text-[#c9a227] hover:text-[#e0b83a] transition-colors">Privacy Policy</Link>
            </span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-400">{errors.acceptTerms.message}</p>}

          <Button
            type="submit"
            loading={register_.isPending}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)',
              boxShadow: '0 4px 18px rgba(26,109,204,0.35)',
              border: 'none',
            }}
          >
            Create account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-white/45">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#c9a227] hover:text-[#e0b83a] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
