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
      <Card className="rounded-2xl shadow-xl shadow-slate-900/10">
        <CardContent className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--color-green-600)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h2)] font-extrabold tracking-tight text-[var(--color-navy-900)]">Check your email</h1>
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            We&apos;ve sent a verification link to confirm your account. Once verified, you can sign in and start your merchant application.
          </p>
        </CardContent>
      </Card>
    );
  }

  const errorMessage = register_.error instanceof ApiError ? register_.error.message : register_.error ? 'Registration failed. Please try again.' : null;

  return (
    <Card className="rounded-2xl shadow-xl shadow-slate-900/10">
      <CardContent>
        <h1 className="text-[length:var(--text-h2)] font-extrabold tracking-tight text-[var(--color-navy-900)]">Create your GiantPay account</h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Start with sandbox access — production activates after review.</p>

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

          <Button type="submit" loading={register_.isPending} className="mt-1 rounded-xl">
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
