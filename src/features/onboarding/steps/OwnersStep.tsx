import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/feedback/Alert';
import type { OwnerInfo } from '@/types/onboarding';

function emptyOwner(): OwnerInfo {
  return { id: crypto.randomUUID(), fullName: '', role: '', ownershipPercentage: null, nationalIdNumber: '', isBeneficialOwner: false };
}

export function OwnersStep({ initialOwners, saving, onBack, onNext }: { initialOwners: OwnerInfo[]; saving: boolean; onBack: () => void; onNext: (owners: OwnerInfo[]) => void }) {
  const [owners, setOwners] = useState<OwnerInfo[]>(initialOwners.length > 0 ? initialOwners : [emptyOwner()]);
  const [touched, setTouched] = useState(false);

  function updateOwner(id: string, patch: Partial<OwnerInfo>) {
    setOwners((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  const isValid = owners.every((o) => o.fullName.trim() && o.role.trim() && o.nationalIdNumber.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onNext(owners);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">Ownership and leadership</h2>
      <p className="text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Add directors, responsible officers and beneficial owners as required for your business type.</p>

      {touched && !isValid && <Alert variant="danger">Complete each owner's name, role and identity number before continuing.</Alert>}

      <div className="flex flex-col gap-4">
        {owners.map((owner, index) => (
          <Card key={owner.id}>
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[length:var(--text-label)] font-semibold text-[var(--color-neutral-700)]">Owner {index + 1}</p>
                {owners.length > 1 && (
                  <IconButton label={`Remove owner ${index + 1}`} onClick={() => setOwners((prev) => prev.filter((o) => o.id !== owner.id))}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name" required error={touched && !owner.fullName ? 'Required' : undefined}>
                  {(fp) => <Input value={owner.fullName} onChange={(e) => updateOwner(owner.id, { fullName: e.target.value })} {...fp} />}
                </FormField>
                <FormField label="Role" required help="e.g. Director, CEO" error={touched && !owner.role ? 'Required' : undefined}>
                  {(fp) => <Input value={owner.role} onChange={(e) => updateOwner(owner.id, { role: e.target.value })} {...fp} />}
                </FormField>
                <FormField label="Ownership %" optional>
                  {(fp) => (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={owner.ownershipPercentage ?? ''}
                      onChange={(e) => updateOwner(owner.id, { ownershipPercentage: e.target.value ? Number(e.target.value) : null })}
                      {...fp}
                    />
                  )}
                </FormField>
                <FormField label="National ID number" required error={touched && !owner.nationalIdNumber ? 'Required' : undefined}>
                  {(fp) => <Input value={owner.nationalIdNumber} onChange={(e) => updateOwner(owner.id, { nationalIdNumber: e.target.value })} {...fp} />}
                </FormField>
              </div>
              <label className="mt-3 flex items-center gap-2 text-[length:var(--text-label)] text-[var(--color-neutral-700)]">
                <Checkbox checked={owner.isBeneficialOwner} onCheckedChange={(checked) => updateOwner(owner.id, { isBeneficialOwner: checked === true })} />
                This person is a beneficial owner
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" variant="secondary" className="self-start" onClick={() => setOwners((prev) => [...prev, emptyOwner()])}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add another owner
      </Button>

      <div className="flex justify-between border-t border-[var(--color-neutral-200)] pt-4">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" loading={saving}>
          Save & continue
        </Button>
      </div>
    </form>
  );
}
