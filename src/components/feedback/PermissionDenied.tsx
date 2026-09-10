import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function PermissionDenied({ backTo = '/dashboard' }: { backTo?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <ShieldAlert className="h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
      <div className="max-w-sm">
        <p className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">
          You don&apos;t have access to this page
        </p>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
          Your account doesn&apos;t have permission to view this. Contact an administrator on your team if you believe
          this is a mistake.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link to={backTo}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
