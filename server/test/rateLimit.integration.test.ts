import { randomUUID } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { RedisRateLimitStore } from '../src/rateLimit.js';

const url=process.env.TEST_REDIS_URL;
const integration=url?describe:describe.skip;
integration('distributed Redis rate limiting',()=>{
  it('shares atomic limits across instances and concurrent requests',async()=>{const a=await RedisRateLimitStore.connect(url!),b=await RedisRateLimitStore.connect(url!);try{const key=`test:${randomUUID()}`;const results=await Promise.all(Array.from({length:20},(_,i)=>(i%2?a:b).consume(key,10,30)));expect(results.filter(x=>x.allowed)).toHaveLength(10);expect(results.filter(x=>!x.allowed)).toHaveLength(10);}finally{await Promise.all([a.close(),b.close()]);}});
});
