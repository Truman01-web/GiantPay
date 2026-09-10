import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  requestId?: string;
  onRetry?: () => void;
}

/** Safe, human-readable error surface — never renders a raw stack trace,
 * SQL error, or provider payload (see docs/frontend-security.md). */
export function ErrorState({ title = 'Something went wrong', message, requestId, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <AlertTriangle className="h-8 w-8 text-[var(--color-red-600)]" aria-hidden="true" />
      <div className="max-w-sm">
        <p className="text-[length:var(--text-h4)] font-semibold text-[var(--color-navy-900)]">{title}</p>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">{message}</p>
        {requestId && <p className="mt-2 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">Reference: {requestId}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
