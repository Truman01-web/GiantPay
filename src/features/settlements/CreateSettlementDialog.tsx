import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { useSettlementActions } from './useSettlementsQueries';

export function CreateSettlementDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: string) => void }) {
  const actions = useSettlementActions();
  const [currency, setCurrency] = useState('MWK');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [validation, setValidation] = useState<string>();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.submitted === 'true') return;
    if (!/^[A-Z]{3}$/.test(currency) || !periodStart || !periodEnd || periodEnd <= periodStart) {
      setValidation('Choose a three-letter currency and an end date after the start date.');
      return;
    }
    form.dataset.submitted = 'true';
    try {
      const batch = await actions.create.mutateAsync({ currency, periodStart: `${periodStart}T00:00:00.000Z`, periodEnd: `${periodEnd}T00:00:00.000Z`, idempotencyKey: key });
      setKey(crypto.randomUUID());
      onCreated(batch.id);
    } catch {
      delete form.dataset.submitted;
    }
  }

  const error = actions.create.error instanceof ApiError ? actions.create.error.message : actions.create.error ? 'The settlement batch could not be created.' : undefined;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent title="Create sandbox settlement" description="The selected UTC period must already have a completed, exception-free payment reconciliation.">
    <form className="space-y-4" onSubmit={submit} noValidate>
      {(validation || error) && <Alert variant="danger">{validation ?? error}</Alert>}
      <FormField label="Currency" required help="ISO 4217 code, for example MWK.">{(props) => <Input {...props} value={currency} maxLength={3} onChange={(event) => { setCurrency(event.target.value.toUpperCase()); setValidation(undefined); }} />}</FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Period start (UTC)" required>{(props) => <Input {...props} type="date" value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setValidation(undefined); }} />}</FormField>
        <FormField label="Period end (UTC, exclusive)" required>{(props) => <Input {...props} type="date" value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setValidation(undefined); }} />}</FormField>
      </div>
      <Alert variant="info">Creating or approving this sandbox record does not execute an external transfer.</Alert>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={actions.create.isPending}>Create batch</Button></div>
    </form>
  </DialogContent></Dialog>;
}
