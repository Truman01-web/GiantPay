type Labels=Record<string,string>;
const safe=/^[A-Z0-9_:/{}.-]{1,160}$/i;
export class MetricsRegistry{
 private counters=new Map<string,number>();private durations=new Map<string,{count:number,totalMs:number,maxMs:number}>();
 private key(name:string,labels:Labels){const entries=Object.entries(labels).sort(([a],[b])=>a.localeCompare(b));if(!safe.test(name)||entries.some(([k,v])=>!safe.test(k)||!safe.test(v)||/@|\+?[0-9]{9,}|gp_(test|live)_|bearer|token|req_/i.test(v)))throw new Error('UNSAFE_METRIC_LABEL');return `${name}{${entries.map(([k,v])=>`${k}=${v}`).join(',')}}`;}
 increment(name:string,labels:Labels={},value=1){const k=this.key(name,labels);this.counters.set(k,(this.counters.get(k)??0)+value);}
 duration(name:string,labels:Labels,valueMs:number){const k=this.key(name,labels),v=this.durations.get(k)??{count:0,totalMs:0,maxMs:0};v.count++;v.totalMs+=Math.max(0,valueMs);v.maxMs=Math.max(v.maxMs,valueMs);this.durations.set(k,v);}
 snapshot(){return {counters:Object.fromEntries(this.counters),durations:Object.fromEntries(this.durations)};}
 reset(){this.counters.clear();this.durations.clear();}
}
export const operationalMetrics=new MetricsRegistry();
