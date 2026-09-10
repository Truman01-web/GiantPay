import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <FileQuestion className="h-10 w-10 text-[var(--color-neutral-400)]" aria-hidden="true" />
      <h1 className="text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Page not found</h1>
      <p className="max-w-sm text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild variant="secondary">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
