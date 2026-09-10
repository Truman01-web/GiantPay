import { useRef, useState } from 'react';
import { FileUpload } from '@/components/forms/FileUpload';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { merchantsApi } from '@/services/api/merchants';
import type { UploadedDocument } from '@/types/onboarding';

const CATEGORIES = [
  { key: 'incorporation', label: 'Certificate of Incorporation' },
  { key: 'proof_of_address', label: 'Proof of business address' },
  { key: 'director_id', label: "Director's identification" },
];

interface CategorizedDoc extends UploadedDocument {
  category: string;
}

export function DocumentsStep({ initialDocuments, saving, onBack, onNext }: { initialDocuments: UploadedDocument[]; saving: boolean; onBack: () => void; onNext: (documents: UploadedDocument[]) => void }) {
  const [documents, setDocuments] = useState<CategorizedDoc[]>(initialDocuments as CategorizedDoc[]);
  const [touched, setTouched] = useState(false);
  // Retrying an upload needs the original File object, which can't live in
  // component state (it's not serializable data) — kept alongside state in
  // a ref, keyed by the document's local id, and dropped once a file is
  // removed or successfully uploaded.
  const fileRefs = useRef(new Map<string, File>());

  const allCategoriesHaveAtLeastOne = CATEGORIES.every((c) => documents.some((d) => d.category === c.key && d.status === 'UPLOADED'));

  async function uploadOne(localId: string, category: string, file: File) {
    setDocuments((prev) => prev.map((d) => (d.id === localId ? { ...d, status: 'UPLOADING', uploadProgress: 0 } : d)));
    try {
      await merchantsApi.uploadDocument({ category, file }, { onProgress: (percent) => setDocuments((prev) => prev.map((d) => (d.id === localId ? { ...d, uploadProgress: percent } : d))) });
      setDocuments((prev) => prev.map((d) => (d.id === localId ? { ...d, status: 'UPLOADED', uploadProgress: 100 } : d)));
      fileRefs.current.delete(localId);
    } catch {
      setDocuments((prev) => prev.map((d) => (d.id === localId ? { ...d, status: 'FAILED' } : d)));
    }
  }

  function handleFilesSelected(category: string, files: File[]) {
    for (const file of files) {
      const localId = crypto.randomUUID();
      fileRefs.current.set(localId, file);
      setDocuments((prev) => [...prev, { id: localId, category, fileName: file.name, sizeBytes: file.size, status: 'UPLOADING', uploadProgress: 0 }]);
      void uploadOne(localId, category, file);
    }
  }

  function handleRemove(id: string) {
    fileRefs.current.delete(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  function handleRetry(id: string) {
    const doc = documents.find((d) => d.id === id);
    const file = fileRefs.current.get(id);
    if (!doc || !file) return;
    void uploadOne(id, doc.category, file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!allCategoriesHaveAtLeastOne) return;
    onNext(documents);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <h2 className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">KYC/KYB documents</h2>
      <p className="text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Upload clear copies (PDF, JPG or PNG, up to 10MB each).</p>

      {touched && !allCategoriesHaveAtLeastOne && <Alert variant="danger">Upload at least one file for every required document category.</Alert>}

      {CATEGORIES.map((cat) => (
        <FileUpload
          key={cat.key}
          label={cat.label}
          accept=".pdf,.jpg,.jpeg,.png"
          maxSizeBytes={10 * 1024 * 1024}
          documents={documents.filter((d) => d.category === cat.key)}
          onFilesSelected={(files) => handleFilesSelected(cat.key, files)}
          onRemove={handleRemove}
          onRetry={handleRetry}
        />
      ))}

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
