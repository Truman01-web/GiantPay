import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
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
      <Card>
        <CardContent>
          <Alert variant="danger" title="This reset link is invalid">
            Request a new password reset link and try again.
          </Alert>
          <Link to="/forgot-password" className="mt-4 inline-block text-[length:var(--text-label)] font-medium text-[var(--color-blue-600)] hover:underline">
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
    <Card>
      <CardContent>
        <h1 className="text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Set a new password</h1>

        {errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="New password" required help="At least 10 characters" error={errors.password?.message}>
            {(fp) => <PasswordInput autoComplete="new-password" invalid={Boolean(errors.password)} {...fp} {...register('password')} />}
          </FormField>
          <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
            {(fp) => <PasswordInput autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} {...fp} {...register('confirmPassword')} />}
          </FormField>
          <Button type="submit" loading={resetPassword.isPending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
