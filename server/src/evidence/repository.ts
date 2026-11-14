import { createHash } from 'node:crypto';
import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { encryptSecret } from '../developer/webhookSecurity.js';
import { newId } from '../security.js';
import { EvidenceError, type EvidenceRecord, type EvidenceRepository, type EvidenceScanState } from './service.js';

const view = (row: any): EvidenceRecord => ({
  id: row.id, applicationId: row.application_id, merchantId: row.merchant_id,
  uploaderId: row.created_by, category: row.category, ownerType: row.owner_type,
  ownerId: row.owner_id ?? null, fileName: row.file_name, mediaType: row.media_type,
  sizeBytes: Number(row.size_bytes), sha256: row.sha256, scanState: row.scan_state,
  failureCode: row.scan_failure_code ?? null, createdAt: row.created_at, updatedAt: row.updated_at,
});

export class PgEvidenceRepository implements EvidenceRepository {
  constructor(private db: Db, private encryptionSecret: string) {}
  async reserve(input: Omit<EvidenceRecord, 'scanState' | 'failureCode'> & { idempotencyKey: string; requestSha256: string }) {
    return transaction(this.db, async c => {
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${input.merchantId}:evidence:${input.idempotencyKey}`]);
      const prior = await c.query('SELECT * FROM onboarding_evidence WHERE merchant_id=$1 AND upload_idempotency_key=$2', [input.merchantId, input.idempotencyKey]);
      if (prior.rowCount) {
        if (prior.rows[0].upload_request_sha256 !== input.requestSha256) throw new EvidenceError('EVIDENCE_IDEMPOTENCY_CONFLICT', 409, 'The idempotency key was reused with different evidence.');
        return { created: false, record: view(prior.rows[0]) };
      }
      const application = await c.query('SELECT * FROM onboarding_applications WHERE id=$1 AND merchant_id=$2 FOR UPDATE', [input.applicationId, input.merchantId]);
      if (!application.rowCount) throw new EvidenceError('EVIDENCE_APPLICATION_NOT_FOUND', 404, 'Onboarding application was not found.');
      if (!['DRAFT','INFORMATION_REQUIRED'].includes(application.rows[0].status)) throw new EvidenceError('EVIDENCE_APPLICATION_IMMUTABLE', 409, 'Evidence cannot be changed in the current application state.');
      const inserted = await c.query(`INSERT INTO onboarding_evidence(id,application_id,merchant_id,category,owner_type,owner_id,storage_reference_ciphertext,storage_reference_masked,media_type,size_bytes,sha256,file_name,created_by,scan_state,upload_idempotency_key,upload_request_sha256)
        VALUES($1,$2,$3,$4,$5,$6,$7,'private-object',$8,$9,$10,$11,$12,'QUARANTINED',$13,$14) RETURNING *`, [input.id,input.applicationId,input.merchantId,input.category,input.ownerType,input.ownerId,encryptSecret(input.id,this.encryptionSecret),input.mediaType,input.sizeBytes,input.sha256,input.fileName,input.uploaderId,input.idempotencyKey,input.requestSha256]);
      await c.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'ONBOARDING_EVIDENCE_QUARANTINED','onboarding_evidence',$4,$5)`, [newId('aud'),input.uploaderId,input.merchantId,input.id,{applicationId:input.applicationId,category:input.category,sha256:input.sha256}]);
      return { created: true, record: view(inserted.rows[0]) };
    });
  }
  async transition(id: string, merchantId: string, expected: EvidenceScanState, next: EvidenceScanState, actorId: string, metadata: Record<string, unknown> = {}) {
    return transaction(this.db, async c => {
      const current = await c.query('SELECT * FROM onboarding_evidence WHERE id=$1 AND merchant_id=$2 FOR UPDATE', [id,merchantId]);
      if (!current.rowCount) throw new EvidenceError('EVIDENCE_NOT_FOUND',404,'Evidence was not found.');
      if (current.rows[0].scan_state !== expected) throw new EvidenceError('EVIDENCE_STATE_CONFLICT',409,'Evidence changed while the operation was in progress.');
      const failure = next === 'REJECTED' || next === 'FAILED' ? String(metadata.reason ?? 'SCAN_FAILED') : null;
      const changed = await c.query(`UPDATE onboarding_evidence SET scan_state=$1,scan_failure_code=$2,scanner_name=coalesce($3,scanner_name),scanned_at=CASE WHEN $1='CLEAN' THEN now() ELSE scanned_at END WHERE id=$4 RETURNING *`, [next,failure,typeof metadata.scanner==='string'?metadata.scanner:null,id]);
      await c.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,$4,'onboarding_evidence',$5,$6)`, [newId('aud'),actorId,merchantId,`ONBOARDING_EVIDENCE_${next}`,id,metadata]);
      return view(changed.rows[0]);
    });
  }
  async fail(id: string, merchantId: string, expected: EvidenceScanState[], actorId: string, code: string) {
    await transaction(this.db, async c => {
      const changed = await c.query(`UPDATE onboarding_evidence SET scan_state='FAILED',scan_failure_code=$1 WHERE id=$2 AND merchant_id=$3 AND scan_state=ANY($4::text[]) RETURNING id`, [code,id,merchantId,expected]);
      if (changed.rowCount) await c.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'ONBOARDING_EVIDENCE_FAILED','onboarding_evidence',$4,$5)`, [newId('aud'),actorId,merchantId,id,{code}]);
    });
  }
  async find(id: string, merchantId: string) { const row=await this.db.query('SELECT * FROM onboarding_evidence WHERE id=$1 AND merchant_id=$2 AND removed_at IS NULL',[id,merchantId]); return row.rowCount?view(row.rows[0]):null; }
  async auditDownload(record: EvidenceRecord, actorId: string) { await this.db.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,$2,$3,'ONBOARDING_EVIDENCE_DOWNLOAD_AUTHORIZED','onboarding_evidence',$4,$5)`,[newId('aud'),actorId,record.merchantId,record.id,{sha256:createHash('sha256').update(record.sha256).digest('hex')}]); }
}
