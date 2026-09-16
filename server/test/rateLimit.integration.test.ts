import { randomUUID } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { RedisRateLimitStore } from '../src/rateLimit.js';

const url=process.env.TEST_REDIS_URL;
const integration=url?describe:describe.skip;
integration('distributed Redis rate limiting',()=>{
  it('shares atomic limits across instances and concurrent requests',async()=>{const a=await RedisRateLimitStore.connect(url!),b=await RedisRateLimitStore.connect(url!);try{const key=`test:${randomUUID()}`;const results=await Promise.all(Array.from({length:20},(_,i)=>(i%2?a:b).consume(key,10,30)));expect(results.filter(x=>x.allowed)).toHaveLength(10);expect(results.filter(x=>!x.allowed)).toHaveLength(10);}finally{await Promise.all([a.close(),b.close()]);}});
  it.each(['mfa-recovery','mfa-step-up','onboarding-evidence','support-case-create','support-reply','platform-search','dispute-create','dispute-response','dispute-evidence','dispute-internal-note','dispute-decision','dispute-platform-mutation','dispute-platform-search'])('enforces the %s policy atomically',async policy=>{const store=await RedisRateLimitStore.connect(url!);try{const key=`${policy}:integration:${randomUUID()}`;for(let i=0;i<5;i++)expect((await store.consume(key,5,30)).allowed).toBe(true);const denied=await store.consume(key,5,30);expect(denied.allowed).toBe(false);expect(denied.resetSeconds).toBeGreaterThan(0);}finally{await store.close();}});
  it('isolates test identities deterministically',async()=>{const store=await RedisRateLimitStore.connect(url!);try{const run=randomUUID(),a=`mfa-step-up:${run}:a`,b=`mfa-step-up:${run}:b`;expect((await store.consume(a,1,30)).allowed).toBe(true);expect((await store.consume(a,1,30)).allowed).toBe(false);expect((await store.consume(b,1,30)).allowed).toBe(true);}finally{await store.close();}});
  it('recovers after the configured window',async()=>{const store=await RedisRateLimitStore.connect(url!);try{const key=`mfa-recovery:window:${randomUUID()}`;expect((await store.consume(key,1,1)).allowed).toBe(true);expect((await store.consume(key,1,1)).allowed).toBe(false);await new Promise(resolve=>setTimeout(resolve,1100));expect((await store.consume(key,1,1)).allowed).toBe(true);}finally{await store.close();}});
});
