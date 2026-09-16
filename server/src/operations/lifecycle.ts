import { operationalMetrics } from './metrics.js';
export interface LifecycleDependency{name:string;stopClaims?:()=>void|Promise<void>;drain?:()=>Promise<void>;close:()=>Promise<void>}
export class GracefulLifecycle{
 private closing:Promise<{timedOut:boolean}>|null=null;
 constructor(private dependencies:LifecycleDependency[],private timeoutMs:number){}
 shutdown(){if(this.closing)return this.closing;this.closing=this.run();return this.closing;}
 private async run(){operationalMetrics.increment('graceful_shutdown_total',{outcome:'started'});for(const dependency of this.dependencies)await dependency.stopClaims?.();let timedOut=false;let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([Promise.allSettled(this.dependencies.map(x=>x.drain?.()??Promise.resolve())),new Promise<void>(resolve=>{timer=setTimeout(()=>{timedOut=true;resolve();},this.timeoutMs);})]);}finally{if(timer)clearTimeout(timer);}await Promise.allSettled(this.dependencies.map(x=>x.close()));operationalMetrics.increment('graceful_shutdown_total',{outcome:timedOut?'timed_out':'completed'});return {timedOut};}
}

export class ShutdownCoordinator{
 private active:Promise<{timedOut:boolean}>|null=null;
 constructor(private lifecycle:Pick<GracefulLifecycle,'shutdown'>,private deadlineMs:number,private force:(code:number)=>void=(code)=>process.exit(code),private log:(entry:Record<string,string|boolean>)=>void=(entry)=>console.info(JSON.stringify(entry))){}
 shutdown(signal:'SIGTERM'|'SIGINT'){if(this.active)return this.active;this.log({event:'shutdown_started',signal});this.active=this.run();return this.active;}
 private async run(){const timer=setTimeout(()=>{this.log({event:'shutdown_forced',reason:'deadline_exceeded'});this.force(1);},this.deadlineMs);timer.unref?.();try{const result=await this.lifecycle.shutdown();this.log({event:'shutdown_completed',timedOut:result.timedOut});return result;}finally{clearTimeout(timer);}}
}
