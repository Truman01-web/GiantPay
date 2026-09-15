import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CopyButton } from '@/components/ui/CopyButton';
import { useCreateWebhook } from './useDevelopersQueries';
import { toast } from '@/components/feedback/toastStore';
import { ApiError } from '@/services/api/errors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_EVENTS = [
  {
    id: 'payment.status.changed',
    label: 'payment.status.changed',
    description: 'Triggered when a payment succeeds, fails, or expires.',
  },
  {
    id: 'refund.status.changed',
    label: 'refund.status.changed',
    description: 'Triggered when a refund transitions to pending or completed.',
  },
  {
    id: 'checkout.expired',
    label: 'checkout.expired',
    description: 'Triggered when an uncompleted checkout session expires.',
  },
];

export function RegisterWebhookDialog({ open, onOpenChange }: Props) {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'payment.status.changed',
    'refund.status.changed',
  ]);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const mutation = useCreateWebhook();

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setUrl('');
      setSelectedEvents(['payment.status.changed', 'refund.status.changed']);
      setRevealedSecret(null);
      setUrlError(null);
      mutation.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleToggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setUrlError('Webhook URL is required');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && !trimmed.startsWith('http://localhost')) {
        setUrlError('Webhook URL must use HTTPS (except localhost)');
        return;
      }
    } catch {
      setUrlError('Please enter a valid URL (e.g. https://api.yourdomain.com/webhook)');
      return;
    }

    if (selectedEvents.length === 0) {
      toast({ variant: 'error', title: 'Select at least one event subscription' });
      return;
    }

    setUrlError(null);

    try {
      const created = await mutation.mutateAsync({
        url: trimmed,
        events: selectedEvents,
      });

      if (created.secret) {
        setRevealedSecret(created.secret);
      } else {
        toast({ variant: 'success', title: 'Webhook registered' });
        handleClose(false);
      }
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to register webhook',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        title={revealedSecret ? 'Save your webhook signing secret' : 'Register webhook endpoint'}
        description={
          revealedSecret
            ? undefined
            : 'GiantPay will send real-time HTTPS POST requests to this URL for subscribed events.'
        }
      >
        {revealedSecret ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>This is the only time this secret will be revealed.</strong> Store it securely in your
                server environment to verify the <code>X-GiantPay-Signature</code> header on incoming webhooks.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-navy-950)] p-4">
              <p className="font-mono text-xs text-emerald-300 break-all leading-relaxed select-all">
                {revealedSecret}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <CopyButton value={revealedSecret} label="Copy signing secret" />
              <DialogClose asChild>
                <Button variant="primary" size="sm">Done</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="webhook-url" className="block text-xs font-medium text-[var(--color-navy-900)] mb-1.5">
                Endpoint URL
              </label>
              <Input
                id="webhook-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder="https://api.example.com/webhooks/giantpay"
                invalid={Boolean(urlError)}
                autoFocus
                required
              />
              {urlError && <p className="mt-1 text-xs text-[var(--color-red-600)]">{urlError}</p>}
            </div>

            <div>
              <p className="block text-xs font-medium text-[var(--color-navy-900)] mb-2">
                Events to send
              </p>
              <div className="space-y-2 rounded-lg border border-[var(--color-neutral-200)] p-3 bg-[var(--color-neutral-50)]">
                {AVAILABLE_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-white transition-colors"
                  >
                    <input
                      aria-label={`Subscribe to ${event.label}`}
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={() => handleToggleEvent(event.id)}
                      className="mt-0.5 h-4 w-4 rounded border-[var(--color-neutral-300)] text-[var(--color-blue-600)] focus:ring-[var(--color-blue-500)]"
                    />
                    <span className="text-xs">
                      <div className="font-mono font-medium text-[var(--color-navy-900)]">
                        {event.label}
                      </div>
                      <div className="text-[var(--color-navy-600)] mt-0.5">
                        {event.description}
                      </div>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <DialogClose asChild>
                <Button variant="secondary" type="button" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={!url.trim() || selectedEvents.length === 0}
              >
                Register endpoint
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
