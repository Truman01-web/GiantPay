import {useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {useMutation} from '@tanstack/react-query';
import {Card,CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input,PasswordInput} from '@/components/ui/Input';
import {Alert} from '@/components/feedback/Alert';
import {apiClient} from '@/services/api/client';
import {authApi,type LoginResult} from '@/services/api/auth';
import {ApiError} from '@/services/api/errors';
import {useSessionStore} from '@/services/auth/sessionStore';
import {safeRedirectPath} from '@/lib/safeRedirect';
import {staffLandingPath} from '@/types/auth';
import type {Session} from '@/types/auth';

type Stage='credentials'|'enroll'|'challenge'|'recovery';
export function StaffLoginFlow(){
 const [stage,setStage]=useState<Stage>('credentials'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[challengeId,setChallengeId]=useState(''),[secret,setSecret]=useState(''),[uri,setUri]=useState(''),[codes,setCodes]=useState<string[]>([]),[error,setError]=useState('');
 const navigate=useNavigate(),[params]=useSearchParams(),setSession=useSessionStore(s=>s.setSession);
 const requestedDestination=params.get('returnTo');
 const staffDestination=(fallback:string)=>{const candidate=safeRedirectPath(requestedDestination,fallback);return candidate==='/admin'||candidate.startsWith('/admin/')?candidate:fallback;};
 const mutation=useMutation({mutationFn:async()=>{setError('');if(stage==='credentials')return authApi.login({email,password});if(stage==='enroll'&&!secret)return apiClient.post<{secret:string;otpauthUri:string}>('/staff/auth/mfa/enrollment',{challengeId});if(stage==='enroll')return apiClient.post<{enrolled:true;recoveryCodes:string[]}>('/staff/auth/mfa/enrollment/verify',{challengeId,code});return authApi.verifyMfa({challengeId,code});},onSuccess:(result:unknown)=>{if(stage==='credentials'){const r=result as LoginResult&{challengeId?:string};setChallengeId(r.challengeId??r.mfaChallenge?.challengeId??'');setStage(r.status==='MFA_ENROLLMENT_REQUIRED'?'enroll':'challenge');return;}if(stage==='enroll'&&!secret){const enrollment=result as {secret:string;otpauthUri:string};setSecret(enrollment.secret);setUri(enrollment.otpauthUri);return;}if(stage==='enroll'){setCodes((result as {recoveryCodes:string[]}).recoveryCodes);setStage('recovery');return;}const authenticated=result as {session:Session};setSession(authenticated.session);navigate(staffDestination(staffLandingPath(authenticated.session)),{replace:true});},onError:(cause)=>setError(cause instanceof ApiError?cause.message:'We could not complete staff sign-in. Try again.')});
 const submit=(event:React.FormEvent)=>{event.preventDefault();mutation.mutate();};
 return <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"><CardContent className="p-6 sm:p-8"><div className="mb-6"><p className="text-sm font-bold uppercase tracking-[.18em] text-blue-700">GiantPlus</p><h1 className="mt-2 text-2xl font-bold text-slate-950">Staff portal</h1><p className="mt-1 text-sm text-slate-600">Authorized GiantPlus staff only. MFA is required.</p></div>{error&&<Alert variant="danger">{error}</Alert>}
 {stage==='credentials'&&<form className="mt-5 space-y-4" onSubmit={submit}><label className="block text-sm font-medium">Staff email<Input className="mt-1" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="block text-sm font-medium">Password<PasswordInput className="mt-1" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><Button className="w-full" type="submit" loading={mutation.isPending}>Continue securely</Button></form>}
 {stage==='enroll'&&!secret&&<div className="mt-5"><p className="text-sm text-slate-700">Your administrator has provisioned this account. Set up an authenticator before access can be granted.</p><Button className="mt-4 w-full" onClick={()=>mutation.mutate()} loading={mutation.isPending}>Begin MFA enrollment</Button></div>}
 {stage==='enroll'&&secret&&<form className="mt-5 space-y-4" onSubmit={submit}><div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">Authenticator setup key</p><code className="mt-1 block break-all" aria-label="Authenticator secret">{secret}</code><p className="mt-2 break-all text-xs text-slate-500">{uri}</p></div><label className="block text-sm font-medium">Six-digit code<Input className="mt-1" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required/></label><Button className="w-full" type="submit" loading={mutation.isPending}>Verify and enroll</Button></form>}
 {stage==='challenge'&&<form className="mt-5 space-y-4" onSubmit={submit}><label className="block text-sm font-medium">Authenticator code<Input className="mt-1" autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required/></label><Button className="w-full" type="submit" loading={mutation.isPending}>Sign in</Button></form>}
 {stage==='recovery'&&<div className="mt-5"><Alert variant="warning">Store these one-time recovery codes securely. They will not be shown again.</Alert><ul className="my-4 grid grid-cols-2 gap-2 font-mono text-sm" aria-label="Recovery codes">{codes.map(x=><li key={x}>{x}</li>)}</ul><Button className="w-full" onClick={()=>{setStage('credentials');setPassword('');setCode('');setSecret('');}}>Return to sign in</Button></div>}
 </CardContent></Card>;
}
