import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { useMfaVerifyMutation } from './useAuthMutations';
import type { MfaChallenge } from '@/types/auth';

function useCountdown(targetIso: string) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(targetIso).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(new Date(targetIso).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return Math.max(0, remainingMs);
}

export function MfaChallengeForm({ challenge, onVerified }: { challenge: MfaChallenge; onVerified: () => void }) {
  const [current] = useState(challenge);
  const [digits, setDigits] = useState<string[]>(Array(current.codeLength).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const verify = useMfaVerifyMutation();

  const expiresInMs = useCountdown(current.expiresAt);
  const expired = expiresInMs <= 0;

  const code = digits.join('');

  const expiresLabel = useMemo(() => {
    const totalSeconds = Math.ceil(expiresInMs / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [expiresInMs]);

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)));
      return;
    }
    setDigits((prev) => prev.map((d, i) => (i === index ? clean.slice(-1) : d)));
    inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, current.codeLength);
    if (!pasted) return;
    e.preventDefault();
    setDigits((prev) => prev.map((d, i) => pasted[i] ?? d));
    inputRefs.current[Math.min(pasted.length, current.codeLength - 1)]?.focus();
  }

  async function handleVerify() {
    try {
      await verify.mutateAsync({ challengeId: current.challengeId, code });
      onVerified();
    } catch {
      // Surfaced via verify.error below.
    }
  }

  const errorMessage =
    verify.error instanceof ApiError
      ? verify.error.message
      : verify.error
        ? 'We could not verify that code. Please try again.'
        : null;

  return (
    <Card>
      <CardContent>
        <h1 className="text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Verify it's you</h1>
        <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
          Enter the {current.codeLength}-digit code from your authenticator app.
        </p>

        {expired && (
          <div className="mt-4">
            <Alert variant="warning">This TOTP challenge has expired. Sign in again to start a new challenge.</Alert>
          </div>
        )}
        {!expired && errorMessage && (
          <div className="mt-4">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <div className="mt-5 flex justify-between gap-2" role="group" aria-label="Verification code">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              aria-label={`Digit ${i + 1} of ${current.codeLength}`}
              maxLength={1}
              value={digit}
              disabled={expired}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digit) inputRefs.current[i - 1]?.focus();
              }}
              className="h-12 w-11 rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] text-center text-[length:var(--text-h3)] tabular-nums focus:border-[var(--color-blue-500)] disabled:bg-[var(--color-neutral-50)]"
            />
          ))}
        </div>

        <p className="mt-3 text-[length:var(--text-help)] text-[var(--color-neutral-500)]" aria-live="polite">
          {expired ? 'Code expired' : `Expires in ${expiresLabel}`}
        </p>

        <Button className="mt-5 w-full" disabled={code.length !== current.codeLength || expired} loading={verify.isPending} onClick={handleVerify}>
          Verify
        </Button>

        <p className="mt-4 text-[length:var(--text-label)] text-[var(--color-neutral-500)]">
          Authenticator-app TOTP codes cannot be resent. Open your authenticator app for the current code.
        </p>
      </CardContent>
    </Card>
  );
}
