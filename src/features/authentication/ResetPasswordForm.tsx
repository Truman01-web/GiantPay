import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { Logo } from '@/components/navigation/Logo';
import { ApiError } from '@/services/api/errors';
import { resetPasswordSchema, type ResetPasswordFormValues } from './schemas';
import { useResetPasswordMutation } from './useAuthMutations';

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
      <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/75 sm:bg-white/80 backdrop-blur-2xl shadow-2xl shadow-blue-950/15">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo variant="full" />
          </div>
          <Alert variant="danger" title="This reset link is invalid">
            Request a new password reset link and try again.
          </Alert>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-sm font-semibold text-[#1B4FD8] hover:underline"
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a secure password for your GiantPay account.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField
            label="New password"
            required
            help="At least 12 characters"
            error={errors.password?.message}
          >
            {(fp) => (
              <PasswordInput
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
                {...fp}
                {...register('password')}
              />
            )}
          </FormField>
          <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
            {(fp) => (
              <PasswordInput
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
                {...fp}
                {...register('confirmPassword')}
              />
            )}
          </FormField>
          <Button
            type="submit"
            loading={resetPassword.isPending}
            className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-[#1B4FD8] via-blue-600 to-[#103bb0] font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
