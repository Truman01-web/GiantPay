import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Alert } from '@/components/feedback/Alert';
import { authApi, type LoginResult } from '@/services/api/auth';
import { ApiError } from '@/services/api/errors';
import { useSessionStore } from '@/services/auth/sessionStore';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { staffLandingPath } from '@/types/auth';
import type { Session } from '@/types/auth';

type Stage = 'credentials' | 'challenge';

export function StaffLoginFlow() {
  const [stage, setStage] = useState<Stage>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('your staff email');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
  const requestedDestination = params.get('returnTo');
  const staffDestination = (fallback: string) => {
    const candidate = safeRedirectPath(requestedDestination, fallback);
    return candidate === '/admin' || candidate.startsWith('/admin/') ? candidate : fallback;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setError('');
      if (stage === 'credentials') return authApi.login({ email, password });
      return authApi.verifyMfa({ challengeId, code });
    },
    onSuccess: (result: unknown) => {
      if (stage === 'credentials') {
        const login = result as LoginResult & { challengeId?: string; maskedDestination?: string };
        setChallengeId(login.challengeId ?? login.mfaChallenge?.challengeId ?? '');
        setMaskedDestination(login.maskedDestination ?? 'your staff email');
        setCode('');
        setStage('challenge');
        return;
      }
      const authenticated = result as { session: Session };
      setSession(authenticated.session);
      navigate(staffDestination(staffLandingPath(authenticated.session)), { replace: true });
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : 'We could not complete staff sign-in. Try again.'),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-blue-700">GiantPlus</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Staff portal</h1>
          <p className="mt-1 text-sm text-slate-600">Authorized GiantPlus staff only. MFA is required.</p>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        {stage === 'credentials' ? (
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">
              Staff email
              <Input className="mt-1" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <PasswordInput className="mt-1" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <Button className="w-full" type="submit" loading={mutation.isPending}>Continue securely</Button>
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <p className="text-sm text-slate-600">We sent a six-digit sign-in code to <strong>{maskedDestination}</strong>. The code expires in five minutes.</p>
            <label className="block text-sm font-medium">
              Email verification code
              <Input className="mt-1" autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
            </label>
            <Button className="w-full" type="submit" loading={mutation.isPending}>Verify and sign in</Button>
            <button type="button" className="w-full text-sm text-blue-700 underline" onClick={() => { setStage('credentials'); setPassword(''); setCode(''); setError(''); }}>
              Start again
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
