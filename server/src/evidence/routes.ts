import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import type { RateLimitStore } from '../rateLimit.js';
import { rateLimit } from '../rateLimit.js';
import { apiError, authenticateSessionOrApiKey, newId, requirePermission, requireSession } from '../security.js';
import { PgEvidenceRepository } from './repository.js';
import { EvidenceError, EvidenceService, type EvidenceStore, type MalwareScanner } from './service.js';

export interface EvidenceRuntime { store: EvidenceStore; scanner: MalwareScanner }

const metadataSchema = z.object({
  category: z.enum(['BUSINESS_REGISTRATION','TAX_REGISTRATION','DIRECTOR_IDENTIFICATION','BENEFICIAL_OWNER_IDENTIFICATION','ADDRESS','BANK_ACCOUNT','ADDITIONAL_COMPLIANCE']),
  ownerType: z.enum(['MERCHANT','DIRECTOR','BENEFICIAL_OWNER','REPRESENTATIVE']).default('MERCHANT'),
  ownerId: z.string().max(100).optional(),
});
const unavailable = (r: FastifyRequest,p: FastifyReply) => p.code(503).send(apiError(r,'EVIDENCE_SERVICE_UNAVAILABLE','Private evidence storage and malware scanning are not configured.'));
const safe = (record: any) => ({ id:record.id,applicationId:record.applicationId,category:record.category,ownerType:record.ownerType,ownerId:record.ownerId,fileName:record.fileName,mediaType:record.mediaType,sizeBytes:record.sizeBytes,sha256:record.sha256,scanState:record.scanState,failureCode:record.failureCode,createdAt:record.createdAt,updatedAt:record.updatedAt });

export async function registerEvidenceRoutes(app:FastifyInstance,config:Config,db:Db,limits:RateLimitStore,runtime?:EvidenceRuntime){
  const auth=authenticateSessionOrApiKey(db,config.PASSWORD_PEPPER,limits,config);
  const session=async(r:FastifyRequest,p:FastifyReply)=>requireSession(r,p);
  const repository=new PgEvidenceRepository(db,config.WEBHOOK_SECRET_KEY??config.COOKIE_SECRET);
  const service=runtime?new EvidenceService(repository,runtime.store,runtime.scanner):null;
  app.post('/v1/merchants/onboarding/evidence/upload',{bodyLimit:11*1024*1024,preHandler:[auth,session,requirePermission('onboarding:write'),rateLimit(limits,config,'onboarding-evidence-upload',10,3600,r=>String(r.actor!.merchantId))]},async(r,p)=>{
    if(!service)return unavailable(r,p);
    try{
      const key=z.string().min(8).max(128).parse(r.headers['idempotency-key']);
      const part=await r.file({limits:{fileSize:10*1024*1024,files:1,fields:4}});
      if(!part)throw new EvidenceError('EVIDENCE_FILE_REQUIRED',400,'One evidence file is required.');
      const value=await part.toBuffer();
      const raw=(part.fields as any).metadata?.value;
      const metadata=metadataSchema.parse(JSON.parse(typeof raw==='string'?raw:'{}'));
      const application=await db.query(`SELECT id FROM onboarding_applications WHERE merchant_id=$1`,[r.actor!.merchantId]);
      if(!application.rowCount)throw new EvidenceError('EVIDENCE_APPLICATION_NOT_FOUND',404,'Onboarding application was not found.');
      const record=await service.upload({id:newId('evd'),applicationId:application.rows[0].id,merchantId:r.actor!.merchantId!,uploaderId:r.actor!.id,category:metadata.category,ownerType:metadata.ownerType,ownerId:metadata.ownerId,fileName:part.filename,mediaType:part.mimetype,value,idempotencyKey:key});
      return p.code(record.scanState==='CLEAN'?201:202).send(safe(record));
    }catch(error){
      if(error instanceof EvidenceError)return p.code(error.status).send(apiError(r,error.code,error.message));
      if(error instanceof z.ZodError||error instanceof SyntaxError)return p.code(400).send(apiError(r,'EVIDENCE_METADATA_INVALID','Evidence metadata is invalid.'));
      if((error as any)?.code==='FST_REQ_FILE_TOO_LARGE')return p.code(413).send(apiError(r,'EVIDENCE_SIZE_INVALID','Evidence must be no larger than 10 MiB.'));
      throw error;
    }
  });
  app.get('/v1/merchants/onboarding/evidence/:id/download',{preHandler:[auth,session,requirePermission('onboarding:read')]},async(r,p)=>{
    if(!service)return unavailable(r,p);
    const id=z.string().min(1).max(128).parse((r.params as any).id),record=await repository.find(id,r.actor!.merchantId!);
    if(!record)return p.code(404).send(apiError(r,'EVIDENCE_NOT_FOUND','Evidence was not found.'));
    try{
      await repository.auditDownload(record,r.actor!.id);
      const value=await service.download(record);
      const extension=record.mediaType==='application/pdf'?'pdf':record.mediaType==='image/png'?'png':'jpg';
      return p.header('Content-Type',record.mediaType).header('Content-Disposition',`attachment; filename="evidence-${record.id}.${extension}"`).header('X-Content-Type-Options','nosniff').header('Cache-Control','no-store, private').send(value);
    }catch(error){if(error instanceof EvidenceError)return p.code(error.status).send(apiError(r,error.code,error.message));throw error;}
  });
}
