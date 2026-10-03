import { createHash } from 'node:crypto';

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export type EvidenceScanState = 'HISTORICAL_METADATA' | 'QUARANTINED' | 'SCANNING' | 'CLEAN' | 'REJECTED' | 'FAILED';

export interface EvidenceRecord {
  id: string; applicationId: string; merchantId: string; uploaderId: string;
  category: string; ownerType: string; ownerId: string | null; fileName: string;
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png'; sizeBytes: number;
  sha256: string; scanState: EvidenceScanState; failureCode: string | null;
  createdAt?: string; updatedAt?: string;
}

export interface EvidenceRepository {
  reserve(input: Omit<EvidenceRecord, 'scanState' | 'failureCode'> & { idempotencyKey: string; requestSha256: string }): Promise<{ created: boolean; record: EvidenceRecord }>;
  transition(id: string, merchantId: string, expected: EvidenceScanState, next: EvidenceScanState, actorId: string, metadata?: Record<string, unknown>): Promise<EvidenceRecord>;
  fail(id: string, merchantId: string, expected: EvidenceScanState[], actorId: string, code: string): Promise<void>;
}

export interface EvidenceStore {
  put(id: string, value: Buffer): Promise<void>;
  get(id: string, maximumBytes: number): Promise<Buffer>;
  delete(id: string): Promise<void>;
}

export interface MalwareScanner {
  readonly name: string;
  scan(value: Buffer, signal: AbortSignal): Promise<'CLEAN' | 'INFECTED'>;
}

export class EvidenceError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}

const allowed: Record<string, { extensions: string[]; signature: (value: Buffer) => boolean }> = {
  'application/pdf': { extensions: ['.pdf'], signature: (v) => v.subarray(0, 5).toString('ascii') === '%PDF-' },
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], signature: (v) => v.length >= 3 && v[0] === 0xff && v[1] === 0xd8 && v[2] === 0xff },
  'image/png': { extensions: ['.png'], signature: (v) => v.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
};

export function validateEvidenceFile(fileName: string, mediaType: string, value: Buffer): asserts mediaType is EvidenceRecord['mediaType'] {
  if (!fileName || fileName.length > 255 || /[\\/\0-\x1f\x7f]/.test(fileName) || fileName === '.' || fileName === '..')
    throw new EvidenceError('EVIDENCE_FILE_NAME_INVALID', 400, 'The evidence filename is invalid.');
  if (value.length < 1 || value.length > MAX_EVIDENCE_BYTES)
    throw new EvidenceError('EVIDENCE_SIZE_INVALID', 413, 'Evidence must be no larger than 10 MiB.');
  const rule = allowed[mediaType];
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (!rule || !rule.extensions.includes(extension) || !rule.signature(value))
    throw new EvidenceError('EVIDENCE_TYPE_INVALID', 415, 'Evidence must be a PDF, JPEG, or PNG with a matching file signature.');
}

function deadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { controller.abort(); reject(new EvidenceError('EVIDENCE_SCAN_TIMEOUT', 503, 'Evidence scanning timed out.')); }, timeoutMs);
    work(controller.signal).then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

export class EvidenceService {
  constructor(private repository: EvidenceRepository, private store: EvidenceStore, private scanner: MalwareScanner, private scanTimeoutMs = 15_000) {}

  async upload(input: { id: string; applicationId: string; merchantId: string; uploaderId: string; category: string; ownerType: string; ownerId?: string; fileName: string; mediaType: string; value: Buffer; idempotencyKey: string }): Promise<EvidenceRecord> {
    validateEvidenceFile(input.fileName, input.mediaType, input.value);
    const sha256 = createHash('sha256').update(input.value).digest('hex');
    const requestSha256 = createHash('sha256').update(JSON.stringify({ applicationId: input.applicationId, category: input.category, ownerType: input.ownerType, ownerId: input.ownerId ?? null, fileName: input.fileName, mediaType: input.mediaType, sizeBytes: input.value.length, sha256 })).digest('hex');
    const reserved = await this.repository.reserve({ id: input.id, applicationId: input.applicationId, merchantId: input.merchantId, uploaderId: input.uploaderId, category: input.category, ownerType: input.ownerType, ownerId: input.ownerId ?? null, fileName: input.fileName, mediaType: input.mediaType, sizeBytes: input.value.length, sha256, idempotencyKey: input.idempotencyKey, requestSha256 });
    if (!reserved.created) return reserved.record;
    let state: EvidenceScanState = 'QUARANTINED';
    try {
      await this.store.put(input.id, input.value);
      await this.repository.transition(input.id, input.merchantId, 'QUARANTINED', 'SCANNING', input.uploaderId, { scanner: this.scanner.name });
      state = 'SCANNING';
      const verdict = await deadline(signal => this.scanner.scan(input.value, signal), this.scanTimeoutMs);
      if (verdict !== 'CLEAN') {
        await this.repository.transition(input.id, input.merchantId, 'SCANNING', 'REJECTED', input.uploaderId, { scanner: this.scanner.name, reason: 'MALWARE_DETECTED' });
        await this.store.delete(input.id);
        return { ...reserved.record, scanState: 'REJECTED', failureCode: 'MALWARE_DETECTED' };
      }
      return await this.repository.transition(input.id, input.merchantId, 'SCANNING', 'CLEAN', input.uploaderId, { scanner: this.scanner.name });
    } catch (error) {
      const code = error instanceof EvidenceError ? error.code : 'EVIDENCE_SCAN_FAILED';
      await this.store.delete(input.id).catch(() => undefined);
      await this.repository.fail(input.id, input.merchantId, [state], input.uploaderId, code).catch(() => undefined);
      if (error instanceof EvidenceError) throw error;
      throw new EvidenceError('EVIDENCE_SCAN_FAILED', 503, 'Evidence scanning is unavailable.');
    }
  }

  async download(record: EvidenceRecord): Promise<Buffer> {
    if (record.scanState !== 'CLEAN') throw new EvidenceError('EVIDENCE_NOT_AVAILABLE', 409, 'Only clean evidence can be downloaded.');
    const value = await this.store.get(record.id, MAX_EVIDENCE_BYTES);
    const digest = createHash('sha256').update(value).digest('hex');
    if (value.length !== record.sizeBytes || digest !== record.sha256) throw new EvidenceError('EVIDENCE_INTEGRITY_FAILURE', 503, 'Evidence integrity verification failed.');
    return value;
  }
}
