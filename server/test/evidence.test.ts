import { describe, expect, it, vi } from 'vitest';
import { EvidenceError, EvidenceService, MAX_EVIDENCE_BYTES, validateEvidenceFile, type EvidenceRecord, type EvidenceRepository, type EvidenceScanState, type EvidenceStore, type MalwareScanner } from '../src/evidence/service.js';

const pdf=Buffer.from('%PDF-1.7\nbody');
class Repo implements EvidenceRepository {
  record?:EvidenceRecord; digest?:string;
  async reserve(input:any):Promise<{created:boolean;record:EvidenceRecord}>{if(this.record){if(this.digest!==input.requestSha256)throw new EvidenceError('EVIDENCE_IDEMPOTENCY_CONFLICT',409,'conflict');return{created:false,record:this.record};}this.digest=input.requestSha256;const record:EvidenceRecord={...input,scanState:'QUARANTINED',failureCode:null};this.record=record;return{created:true,record};}
  async transition(_id:string,_merchant:string,expected:EvidenceScanState,next:EvidenceScanState,_actor:string,metadata:any={}){if(this.record!.scanState!==expected)throw new EvidenceError('EVIDENCE_STATE_CONFLICT',409,'conflict');this.record={...this.record!,scanState:next,failureCode:next==='REJECTED'?String(metadata.reason):null};return this.record;}
  async fail(_id:string,_merchant:string,_expected:EvidenceScanState[],_actor:string,code:string){this.record={...this.record!,scanState:'FAILED',failureCode:code};}
}
class Store implements EvidenceStore { value?:Buffer; deleted=false; async put(_id:string,v:Buffer){this.value=Buffer.from(v)} async get(){return Buffer.from(this.value!)} async delete(){this.deleted=true;this.value=undefined} }
const input=(value=pdf)=>({id:'evd_12345678',applicationId:'onb_1',merchantId:'m1',uploaderId:'u1',category:'BUSINESS_REGISTRATION',ownerType:'MERCHANT',fileName:'record.pdf',mediaType:'application/pdf',value,idempotencyKey:'stable-key'});
const scanner=(verdict:'CLEAN'|'INFECTED'='CLEAN'):MalwareScanner=>({name:'test-scanner',scan:vi.fn(async()=>verdict)});

describe('secure evidence service',()=>{
  it('accepts only matching PDF signatures',()=>expect(()=>validateEvidenceFile('a.pdf','application/pdf',pdf)).not.toThrow());
  it('rejects a renamed executable',()=>expect(()=>validateEvidenceFile('a.pdf','application/pdf',Buffer.from('MZ bad'))).toThrowError(EvidenceError));
  it('rejects path-like names',()=>expect(()=>validateEvidenceFile('../a.pdf','application/pdf',pdf)).toThrowError(/filename/i));
  it('rejects oversized files',()=>expect(()=>validateEvidenceFile('a.pdf','application/pdf',Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(MAX_EVIDENCE_BYTES)]))).toThrowError(/10 MiB/));
  it('publishes only after a clean scanner verdict',async()=>{const repo=new Repo(),store=new Store(),service=new EvidenceService(repo,store,scanner());expect((await service.upload(input())).scanState).toBe('CLEAN');expect(store.deleted).toBe(false)});
  it('rejects infected evidence and removes quarantine storage',async()=>{const repo=new Repo(),store=new Store(),service=new EvidenceService(repo,store,scanner('INFECTED'));expect((await service.upload(input())).scanState).toBe('REJECTED');expect(store.deleted).toBe(true)});
  it('fails closed and cleans up when the scanner errors',async()=>{const repo=new Repo(),store=new Store(),bad:MalwareScanner={name:'offline',scan:async()=>{throw new Error('offline')}};await expect(new EvidenceService(repo,store,bad).upload(input())).rejects.toMatchObject({code:'EVIDENCE_SCAN_FAILED'});expect(repo.record?.scanState).toBe('FAILED');expect(store.deleted).toBe(true)});
  it('fails closed on timeout and ignores late clean completion',async()=>{const repo=new Repo(),store=new Store(),slow:MalwareScanner={name:'slow',scan:()=>new Promise(resolve=>setTimeout(()=>resolve('CLEAN'),50))};await expect(new EvidenceService(repo,store,slow,5).upload(input())).rejects.toMatchObject({code:'EVIDENCE_SCAN_TIMEOUT'});await new Promise(r=>setTimeout(r,60));expect(repo.record?.scanState).toBe('FAILED')});
  it('returns the prior record for an identical retry',async()=>{const repo=new Repo(),store=new Store(),scan=scanner(),service=new EvidenceService(repo,store,scan);await service.upload(input());expect((await service.upload(input())).scanState).toBe('CLEAN');expect(scan.scan).toHaveBeenCalledTimes(1)});
  it('rejects changed payload reuse',async()=>{const repo=new Repo(),service=new EvidenceService(repo,new Store(),scanner());await service.upload(input());await expect(service.upload({...input(),fileName:'changed.pdf'})).rejects.toMatchObject({code:'EVIDENCE_IDEMPOTENCY_CONFLICT'})});
  it('blocks downloads for non-clean records',async()=>{const service=new EvidenceService(new Repo(),new Store(),scanner());await expect(service.download({...input(),sizeBytes:pdf.length,sha256:'0'.repeat(64),scanState:'QUARANTINED',failureCode:null} as any)).rejects.toMatchObject({code:'EVIDENCE_NOT_AVAILABLE'})});
  it('detects swapped or tampered downloads',async()=>{const store=new Store();store.value=Buffer.from('%PDF-tampered');const service=new EvidenceService(new Repo(),store,scanner());await expect(service.download({...input(),sizeBytes:pdf.length,sha256:'0'.repeat(64),scanState:'CLEAN',failureCode:null} as any)).rejects.toMatchObject({code:'EVIDENCE_INTEGRITY_FAILURE'})});
});
