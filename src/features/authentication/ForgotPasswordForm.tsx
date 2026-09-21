import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/navigation/Logo';
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
      <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 sm:bg-white/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/15">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#1B4FD8] via-sky-400 to-indigo-600" />
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo variant="full" />
          </div>
          <Mail className="mx-auto h-12 w-12 text-[#1B4FD8]" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">Check your email</h1>
          <p className="mt-2 text-sm text-slate-600">
            If an account exists for that address, we&apos;ve sent instructions to reset your password.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

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
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Email address" required error={errors.email?.message}>
            {(fp) => <Input type="email" autoComplete="email" invalid={Boolean(errors.email)} {...fp} {...register('email')} />}
          </FormField>
          <Button
            type="submit"
            loading={forgotPassword.isPending}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-[#1B4FD8] via-blue-600 to-[#103bb0] font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            Send reset link
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-[#1B4FD8] hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

