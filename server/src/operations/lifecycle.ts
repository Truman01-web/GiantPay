export interface LifecycleDependency{name:string;stopClaims?:()=>void|Promise<void>;drain?:()=>Promise<void>;close:()=>Promise<void>}
export class GracefulLifecycle{
 private closing:Promise<{timedOut:boolean}>|null=null;
 constructor(private dependencies:LifecycleDependency[],private timeoutMs:number){}
 shutdown(){if(this.closing)return this.closing;this.closing=this.run();return this.closing;}
 private async run(){for(const dependency of this.dependencies)await dependency.stopClaims?.();let timedOut=false;await Promise.race([Promise.allSettled(this.dependencies.map(x=>x.drain?.()??Promise.resolve())),new Promise<void>(resolve=>setTimeout(()=>{timedOut=true;resolve();},this.timeoutMs))]);await Promise.allSettled(this.dependencies.map(x=>x.close()));return {timedOut};}
}
