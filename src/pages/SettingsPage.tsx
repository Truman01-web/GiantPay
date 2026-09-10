import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';

export default function SettingsPage() {
  const session = useSession();

  return (
    <div>
      <PageHeader title="Settings" description="Your profile and organization details." />
      <div className="max-w-xl">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <FormField label="Full name" htmlFor="profile-name">
              {(fp) => <Input defaultValue={session?.user.name} {...fp} />}
            </FormField>
            <FormField label="Email address" htmlFor="profile-email" help="Contact support to change your sign-in email">
              {(fp) => <Input defaultValue={session?.user.email} disabled {...fp} />}
            </FormField>
            <FormField label="Organization" htmlFor="profile-org">
              {(fp) => <Input defaultValue={session?.user.merchantName ?? ''} disabled {...fp} />}
            </FormField>
            <div className="flex justify-end border-t border-[var(--color-neutral-200)] pt-4">
              <Button>Save changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
