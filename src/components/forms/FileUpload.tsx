import { useRef, useState } from 'react';
import { UploadCloud, FileText, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { UploadedDocument } from '@/types/onboarding';

export interface FileUploadProps {
  label: string;
  /** Native file-picker filter, e.g. ".pdf,.jpg,.jpeg,.png". */
  accept?: string;
  /** Real MIME types to validate against — extensions alone can't be
   * trusted (a renamed file, or any file dropped via drag-and-drop, which
   * ignores `accept` entirely). Falls back to matching `accept`'s
   * extensions only when the browser reports no MIME type at all. */
  acceptedMimeTypes?: string[];
  maxSizeBytes?: number;
  documents: UploadedDocument[];
  onFilesSelected: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

function formatMaxSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function extensionAllowed(fileName: string, accept: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .includes(ext);
}

/** Drag-and-drop + file-selector upload with progress, retry and removal —
 * used for onboarding KYC/KYB documents. File type/size requirements are
 * passed in from backend configuration rather than hard-coded. Rejected
 * files are never silently dropped — the customer always sees why. */
export function FileUpload({ label, accept, acceptedMimeTypes, maxSizeBytes, documents, onFilesSelected, onRemove, onRetry }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (maxSizeBytes && file.size > maxSizeBytes) {
      return `"${file.name}" is too large. Please choose a file under ${formatMaxSize(maxSizeBytes)}.`;
    }
    if (acceptedMimeTypes?.length) {
      const typeOk = file.type ? acceptedMimeTypes.includes(file.type) : accept ? extensionAllowed(file.name, accept) : false;
      if (!typeOk) {
        return `"${file.name}" isn't a supported file type.`;
      }
    }
    return null;
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const accepted: File[] = [];
    let firstRejection: string | null = null;
    for (const file of Array.from(fileList)) {
      const error = validate(file);
      if (error) {
        firstRejection ??= error;
      } else {
        accepted.push(file);
      }
    }
    setRejection(firstRejection);
    if (accepted.length) onFilesSelected(accepted);
  }

  return (
    <div>
      <p className="mb-1.5 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed p-6 text-center',
          dragOver ? 'border-[var(--color-blue-500)] bg-[var(--color-blue-50)]' : 'border-[var(--color-neutral-300)]',
        )}
      >
        <UploadCloud className="h-6 w-6 text-[var(--color-neutral-500)]" aria-hidden="true" />
        <p className="text-[length:var(--text-body)] text-[var(--color-neutral-700)]">
          Drag a file here, or{' '}
          <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-[var(--color-blue-600)] hover:underline">
            browse
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {rejection && (
        <p role="alert" className="mt-2 text-[length:var(--text-help)] text-[var(--color-red-600)]">
          {rejection}
        </p>
      )}

      {documents.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-neutral-200)] p-2.5">
              {doc.status === 'FAILED' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-red-600)]" aria-hidden="true" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-[var(--color-neutral-500)]" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[length:var(--text-label)] font-medium text-[var(--color-neutral-900)]">{doc.fileName}</p>
                {doc.status === 'UPLOADING' && (
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${doc.fileName}`}
                    aria-valuenow={doc.uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-neutral-100)]"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-blue-500)] transition-[width] duration-[var(--duration-base)]"
                      style={{ width: `${doc.uploadProgress}%` }}
                    />
                  </div>
                )}
                {doc.status === 'FAILED' && <p className="text-[length:var(--text-help)] text-[var(--color-red-600)]">{doc.error || 'Upload failed'}</p>}
              </div>
              {doc.status === 'FAILED' && (
                <button type="button" onClick={() => onRetry(doc.id)} aria-label={`Retry uploading ${doc.fileName}`} className="rounded p-1 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                aria-label={doc.status === 'UPLOADING' ? `Cancel uploading ${doc.fileName}` : `Remove ${doc.fileName}`}
                className="rounded p-1 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
