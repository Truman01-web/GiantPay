import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './schemas';
import { useForgotPasswordMutation } from './useAuthMutations';

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
      <Card>
        <CardContent className="text-center">
          <Mail className="mx-auto h-10 w-10 text-[var(--color-blue-600)]" aria-hidden="true" />
          <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Check your email</h1>
          {/* Deliberately does not confirm whether the account exists. */}
          <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            If an account exists for that address, we&apos;ve sent instructions to reset your password.
          </p>
          <Link to="/login" className="mt-4 inline-block text-[length:var(--text-label)] font-medium text-[var(--color-blue-600)] hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <h1 className="text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Reset your password</h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Enter your email and we&apos;ll send you a reset link.</p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Email address" required error={errors.email?.message}>
            {(fp) => <Input type="email" autoComplete="email" invalid={Boolean(errors.email)} {...fp} {...register('email')} />}
          </FormField>
          <Button type="submit" loading={forgotPassword.isPending}>
            Send reset link
          </Button>
        </form>

        <p className="mt-5 text-center text-[length:var(--text-label)] text-[var(--color-neutral-600)]">
          <Link to="/login" className="font-medium text-[var(--color-blue-600)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
