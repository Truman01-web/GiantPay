import { createHmac } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.js';
import { apiError } from './security.js';
import { operationalMetrics } from './operations/metrics.js';

export interface RateLimitResult { allowed: boolean; limit: number; remaining: number; resetSeconds: number }
export interface RateLimitStore { consume(key:string,limit:number,windowSeconds:number):Promise<RateLimitResult>; close():Promise<void>; ping():Promise<void> }

const script=`local current=redis.call('INCR',KEYS[1]) if current==1 then redis.call('EXPIRE',KEYS[1],ARGV[2]) end local ttl=redis.call('TTL',KEYS[1]) return {current,ttl}`;

export class RedisRateLimitStore implements RateLimitStore {
  private constructor(private readonly client:RedisClientType) {}
  static async connect(url:string) { const client=createClient({url,socket:{reconnectStrategy:(retries)=>Math.min(retries*100,2000)}}); client.on('error',()=>undefined); await client.connect(); return new RedisRateLimitStore(client as RedisClientType); }
  async consume(key:string,limit:number,windowSeconds:number) { const value=await this.client.eval(script,{keys:[key],arguments:[String(limit),String(windowSeconds)]}) as [number,number]; const count=Number(value[0]),ttl=Math.max(1,Number(value[1])); return {allowed:count<=limit,limit,remaining:Math.max(0,limit-count),resetSeconds:ttl}; }
  async ping(){await this.client.ping();}
  async close(){if(this.client.isOpen)await this.client.quit();}
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly values=new Map<string,{count:number;expires:number}>();
  constructor(private readonly now=()=>Date.now()){}
  async consume(key:string,limit:number,windowSeconds:number){const now=this.now(),old=this.values.get(key);const item=!old||old.expires<=now?{count:0,expires:now+windowSeconds*1000}:old;item.count++;this.values.set(key,item);return {allowed:item.count<=limit,limit,remaining:Math.max(0,limit-item.count),resetSeconds:Math.max(1,Math.ceil((item.expires-now)/1000))};}
  async ping(){}
  async close(){this.values.clear();}
}

export const safeRateKey=(config:Config,kind:string,value:string)=>`${config.RATE_LIMIT_NAMESPACE}:${kind}:${createHmac('sha256',config.COOKIE_SECRET).update(value.trim().toLowerCase()).digest('hex')}`;

export function rateLimit(store:RateLimitStore,config:Config,policy:string,limit:number,windowSeconds:number,identity:(request:FastifyRequest)=>string|undefined,failClosed=true){
  return async(request:FastifyRequest,reply:FastifyReply)=>{const value=identity(request);if(!value)return;let result:RateLimitResult;try{result=await store.consume(safeRateKey(config,policy,value),limit,windowSeconds);}catch(error){request.log.warn({err:error,policy},'rate limit store unavailable');if(failClosed||config.NODE_ENV==='production')return reply.code(503).send(apiError(request,'SECURITY_SERVICE_UNAVAILABLE','Request protection is temporarily unavailable.'));return;}
    reply.header('RateLimit-Limit',result.limit).header('RateLimit-Remaining',result.remaining).header('RateLimit-Reset',result.resetSeconds);
    if(!result.allowed){operationalMetrics.increment('rate_limit_rejections_total',{policy});reply.header('Retry-After',result.resetSeconds);return reply.code(429).send(apiError(request,'RATE_LIMITED','Too many requests. Try again later.'));}
  };
}
