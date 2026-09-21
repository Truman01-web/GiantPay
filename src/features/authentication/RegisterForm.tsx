import { useState } from 'react';
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
import { registerSchema, type RegisterFormValues } from './schemas';
import { useRegisterMutation } from './useAuthMutations';


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
      <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 sm:bg-white/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/15">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1B4FD8] via-emerald-400 to-teal-600" />
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo variant="full" />
          </div>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">Check your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ve sent a verification link to confirm your account. Once verified, you can sign in and start your merchant application.
          </p>
        </CardContent>
      </Card>
    );
  }

  const errorMessage = register_.error instanceof ApiError ? register_.error.message : register_.error ? 'Registration failed. Please try again.' : null;

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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your GiantPay account</h1>
          <p className="mt-1 text-sm text-slate-500">Start with sandbox access — production activates after review.</p>
        </div>

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}


        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Business name" required error={errors.businessName?.message}>
            {(fp) => <Input invalid={Boolean(errors.businessName)} {...fp} {...register('businessName')} />}
          </FormField>
          <FormField label="Work email" required error={errors.email?.message}>
            {(fp) => <Input type="email" autoComplete="email" invalid={Boolean(errors.email)} {...fp} {...register('email')} />}
          </FormField>
          <FormField label="Phone number" required help="Malawi numbers, e.g. +265 991 234 567" error={errors.phone?.message}>
            {(fp) => <PhoneInput invalid={Boolean(errors.phone)} {...fp} {...register('phone')} />}
          </FormField>
          <FormField label="Password" required help="At least 10 characters" error={errors.password?.message}>
            {(fp) => <PasswordInput autoComplete="new-password" invalid={Boolean(errors.password)} {...fp} {...register('password')} />}
          </FormField>
          <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
            {(fp) => <PasswordInput autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} {...fp} {...register('confirmPassword')} />}
          </FormField>

          <label className="flex items-start gap-2 text-[length:var(--text-label)] text-[var(--color-neutral-700)]">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => <Checkbox className="mt-0.5" checked={field.value} onCheckedChange={field.onChange} />}
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
          {errors.acceptTerms && <p className="text-[length:var(--text-help)] text-[var(--color-red-600)]">{errors.acceptTerms.message}</p>}

          <Button
            type="submit"
            loading={register_.isPending}
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
