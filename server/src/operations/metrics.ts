type Labels=Record<string,string>;
const safe=/^[A-Z0-9_:/{}.-]{1,160}$/i;
const dimensions:Record<string,readonly string[]>={
 http_requests_total:['method','route','statusClass'],
 http_request_duration_ms:['method','route'],
 application_errors_total:['route','kind'],
 authentication_denials_total:['reason'],
 rate_limit_rejections_total:['policy'],
 worker_jobs_total:['worker','outcome'],
 idempotency_requests_total:['operation','outcome'],
 operational_incidents_total:['state','severity'],
 operational_control_decisions_total:['decision','control'],
 dependency_checks_total:['dependency','outcome'],
 graceful_shutdown_total:['outcome']
};
export class MetricsRegistry{
 private counters=new Map<string,number>();private durations=new Map<string,{count:number,totalMs:number,maxMs:number}>();
 constructor(private readonly maxSeriesPerMetric=500){}
 private key(name:string,labels:Labels){const allowed=dimensions[name];const entries=Object.entries(labels).sort(([a],[b])=>a.localeCompare(b));if(!allowed||entries.length!==allowed.length||entries.some(([k])=>!allowed.includes(k))||!safe.test(name)||entries.some(([k,v])=>!safe.test(k)||!safe.test(v)||/@|\+?[0-9]{9,}|[0-9a-f]{8}-[0-9a-f-]{27,}|gp_(test|live)_|bearer|token|req_|\?.*=|\/[A-Za-z0-9_-]{24,}(?:\/|$)/i.test(v)))throw new Error('UNSAFE_METRIC_LABEL');return `${name}{${entries.map(([k,v])=>`${k}=${v}`).join(',')}}`;}
 private bounded(map:Map<string,unknown>,name:string,key:string){if(!map.has(key)&&[...map.keys()].filter(x=>x.startsWith(`${name}{`)).length>=this.maxSeriesPerMetric)throw new Error('METRIC_CARDINALITY_LIMIT');}
 increment(name:string,labels:Labels={},value=1){const k=this.key(name,labels);this.bounded(this.counters,name,k);this.counters.set(k,(this.counters.get(k)??0)+value);}
 duration(name:string,labels:Labels,valueMs:number){const k=this.key(name,labels);this.bounded(this.durations,name,k);const v=this.durations.get(k)??{count:0,totalMs:0,maxMs:0};v.count++;v.totalMs+=Math.max(0,valueMs);v.maxMs=Math.max(v.maxMs,valueMs);this.durations.set(k,v);}
 snapshot(){return {counters:Object.fromEntries(this.counters),durations:Object.fromEntries(this.durations)};}
 reset(){this.counters.clear();this.durations.clear();}
}
export const operationalMetrics=new MetricsRegistry();
