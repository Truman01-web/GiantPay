import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CopyButton } from '@/components/ui/CopyButton';
import { useCreateApiKey } from './useDevelopersQueries';
import { toast } from '@/components/feedback/toastStore';
import { ApiError } from '@/services/api/errors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateApiKeyDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const mutation = useCreateApiKey();

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setName('');
      setRevealedSecret(null);
      mutation.reset();
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const key = await mutation.mutateAsync(name.trim());
      if (key.secret) {
        setRevealedSecret(key.secret);
      } else {
        toast({ variant: 'success', title: 'API key created' });
        handleClose(false);
      }
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to create key',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        title={revealedSecret ? 'Copy your secret key' : 'Create sandbox API key'}
        description={
          revealedSecret
            ? undefined
            : 'Give this key a name to identify which integration or environment uses it.'
        }
      >
        {revealedSecret ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>This is the only time the full secret will be shown.</strong> Copy it now and store it
                securely. It cannot be retrieved again.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-navy-950)] p-4">
              <p className="font-mono text-xs text-emerald-300 break-all leading-relaxed select-all">
                {revealedSecret}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <CopyButton value={revealedSecret} label="Copy secret key" />
              <DialogClose asChild>
                <Button variant="primary" size="sm">Done</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="key-name" className="block text-xs font-medium text-[var(--color-navy-900)] mb-1.5">
                Key name
              </label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Staging E2E Testing"
                autoFocus
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <DialogClose asChild>
                <Button variant="secondary" type="button" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={mutation.isPending} disabled={!name.trim()}>
                Create key
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
