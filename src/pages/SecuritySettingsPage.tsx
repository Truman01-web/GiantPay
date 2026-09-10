import { ShieldCheck, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, PasswordInput } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSession } from '@/hooks/useSession';

export default function SecuritySettingsPage() {
  const session = useSession();

  return (
    <div>
      <PageHeader title="Security settings" description="Manage your password and two-factor authentication." />
      <div className="flex max-w-xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField label="Current password" htmlFor="current-password">
              {(fp) => <PasswordInput autoComplete="current-password" {...fp} />}
            </FormField>
            <FormField label="New password" htmlFor="new-password" help="At least 10 characters">
              {(fp) => <PasswordInput autoComplete="new-password" {...fp} />}
            </FormField>
            <FormField label="Confirm new password" htmlFor="confirm-password">
              {(fp) => <PasswordInput autoComplete="new-password" {...fp} />}
            </FormField>
            <div className="flex justify-end border-t border-[var(--color-neutral-200)] pt-4">
              <Button>Update password</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className={session?.user.mfaEnabled ? 'h-5 w-5 text-[var(--color-green-600)]' : 'h-5 w-5 text-[var(--color-neutral-400)]'} aria-hidden="true" />
                <div>
                  <p className="text-[length:var(--text-body)] font-medium text-[var(--color-navy-900)]">Authenticator app</p>
                  <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Required at sign-in for extra protection.</p>
                </div>
              </div>
              <Badge variant={session?.user.mfaEnabled ? 'success' : 'neutral'}>{session?.user.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <div className="mt-4 flex justify-end border-t border-[var(--color-neutral-200)] pt-4">
              <Button variant="secondary">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {session?.user.mfaEnabled ? 'Reconfigure' : 'Enable two-factor authentication'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <FormField label="Confirm password to continue" htmlFor="reauth-password" help="Highly sensitive actions require re-entering your password.">
              {(fp) => <Input type="password" {...fp} />}
            </FormField>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
