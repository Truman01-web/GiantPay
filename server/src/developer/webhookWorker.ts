import type { Db } from '../db.js';
import { transaction } from '../db.js';
import { newId } from '../security.js';
import type { Config } from '../config.js';
import type { OutboxMessage, OutboxPublisher } from '../outbox/outboxWorker.js';
import { decryptSecret, signWebhook, validateWebhookUrl } from './webhookSecurity.js';

export class MerchantWebhookPublisher implements OutboxPublisher {
  constructor(private db:Db,private maxAttempts:number) {}
  async publish(message:OutboxMessage) {
    const merchantId=(message.payload as any)?.merchantId;
    if(!merchantId)return;
    await this.db.query(`INSERT INTO webhook_deliveries(id,event_id,endpoint_id,merchant_id,max_attempts)
      SELECT $1||substr(md5(e.id),1,12),$2,e.id,e.merchant_id,$3 FROM merchant_webhook_endpoints e
      WHERE e.merchant_id=$4 AND e.enabled AND $5=ANY(e.event_types) ON CONFLICT(event_id,endpoint_id) DO NOTHING`,[newId('whd'),message.id,this.maxAttempts,merchantId,message.eventType]);
  }
}

class DeliveryError extends Error { constructor(public kind:string,public retryable:boolean,public status?:number,public excerpt?:string){super(kind);} }

export class WebhookDeliveryWorker {
  private timer:ReturnType<typeof setTimeout>|null=null; private stopped=true;
  constructor(private db:Db,private config:Config,private pollMs=1000){}
  async runOnce(){
    const row=await transaction(this.db,async c=>{const x=await c.query(`SELECT d.*,e.url,e.event_types,e.secret_ciphertext,o.event_type,o.payload FROM webhook_deliveries d JOIN merchant_webhook_endpoints e ON e.id=d.endpoint_id JOIN outbox_events o ON o.id=d.event_id WHERE (d.status='PENDING' OR (d.status='PROCESSING' AND d.locked_at<now()-interval '5 minutes')) AND d.next_attempt_at<=now() ORDER BY d.created_at FOR UPDATE OF d SKIP LOCKED LIMIT 1`);if(!x.rowCount)return null;const r=x.rows[0];await c.query(`UPDATE webhook_deliveries SET status='PROCESSING',locked_at=now(),attempt_count=attempt_count+1,updated_at=now() WHERE id=$1`,[r.id]);return {...r,attempt_count:Number(r.attempt_count)+1};});
    if(!row)return false;
    const body=Buffer.from(JSON.stringify({id:row.event_id,type:row.event_type,createdAt:new Date().toISOString(),data:row.payload}));
    try {
      await validateWebhookUrl(row.url,this.config.NODE_ENV==='development'&&this.config.WEBHOOK_ALLOW_HTTP_DEVELOPMENT);
      const timestamp=Math.floor(Date.now()/1000),secret=decryptSecret(row.secret_ciphertext,this.config.WEBHOOK_SECRET_KEY??this.config.COOKIE_SECRET);
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.config.WEBHOOK_DELIVERY_TIMEOUT_MS);
      let response:Response; try { response=await fetch(row.url,{method:'POST',redirect:'manual',signal:controller.signal,headers:{'content-type':'application/json','user-agent':'GiantPay-Webhooks/1.0','GiantPay-Event-Id':row.event_id,'GiantPay-Event-Type':row.event_type,'GiantPay-Timestamp':String(timestamp),'GiantPay-Signature':signWebhook(secret,timestamp,body),'GiantPay-Signature-Version':'v1'},body}); } catch(e){throw new DeliveryError(e instanceof Error&&e.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR',true);} finally {clearTimeout(timer);}
      if(response.status>=300&&response.status<400)throw new DeliveryError('REDIRECT_REJECTED',false,response.status);
      const reader=response.body?.getReader();let size=0;const chunks:Uint8Array[]=[];if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>this.config.WEBHOOK_MAX_RESPONSE_BYTES){await reader.cancel();throw new DeliveryError('RESPONSE_TOO_LARGE',false,response.status);}chunks.push(value);}
      const excerpt=Buffer.concat(chunks).toString('utf8').replace(/[\r\n\t]+/g,' ').slice(0,1000);
      if(!response.ok)throw new DeliveryError(`HTTP_${response.status}`,response.status===408||response.status===429||response.status>=500,response.status,excerpt);
      await this.finish(row,null,response.status,excerpt);
    } catch(e){const error=e instanceof DeliveryError?e:new DeliveryError('DELIVERY_ERROR',true);await this.finish(row,error,error.status,error.excerpt);}
    return true;
  }
  private async finish(row:any,error:DeliveryError|null,status?:number,excerpt?:string){await transaction(this.db,async c=>{await c.query(`INSERT INTO webhook_delivery_attempts(id,delivery_id,attempt_number,http_status,error_class,response_excerpt,completed_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(delivery_id,attempt_number) DO NOTHING`,[newId('wha'),row.id,row.attempt_count,status??null,error?.kind??null,excerpt??null]);if(!error)await c.query(`UPDATE webhook_deliveries SET status='SUCCEEDED',succeeded_at=now(),locked_at=NULL,last_http_status=$2,last_response=$3,last_error_class=NULL,updated_at=now() WHERE id=$1`,[row.id,status,excerpt]);else await c.query(`UPDATE webhook_deliveries SET status=CASE WHEN NOT $2 OR attempt_count>=max_attempts THEN 'FAILED' ELSE 'PENDING' END,next_attempt_at=now()+(LEAST(900,power(2,attempt_count))||' seconds')::interval,locked_at=NULL,last_http_status=$3,last_error_class=$4,last_response=$5,updated_at=now() WHERE id=$1`,[row.id,error.retryable,status??null,error.kind,excerpt??null]);});}
  start(){if(!this.stopped)return;this.stopped=false;const tick=async()=>{if(this.stopped)return;try{await this.runOnce();}finally{if(!this.stopped)this.timer=setTimeout(tick,this.pollMs);}};void tick();}
  stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.timer=null;}
}
