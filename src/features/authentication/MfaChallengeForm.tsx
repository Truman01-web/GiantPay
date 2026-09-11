import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { ApiError } from '@/services/api/errors';
import { MARK_SRC, LOGO_SRC } from '@/assets/brand';
import { useMfaVerifyMutation, useResendMfaMutation } from './useAuthMutations';
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
  const [current, setCurrent] = useState(challenge);
  const [digits, setDigits] = useState<string[]>(Array(current.codeLength).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const verify = useMfaVerifyMutation();
  const resend = useResendMfaMutation();

  const expiresInMs = useCountdown(current.expiresAt);
  const resendInMs = useCountdown(current.resendAvailableAt);
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

  async function handleResend() {
    const result = await resend.mutateAsync({ challengeId: current.challengeId });
    setCurrent(result.mfaChallenge);
    setDigits(Array(result.mfaChallenge.codeLength).fill(''));
    inputRefs.current[0]?.focus();
  }

  const errorMessage =
    verify.error instanceof ApiError
      ? verify.error.message
      : verify.error
        ? 'We could not verify that code. Please try again.'
        : null;

  return (
    /* Glassmorphism card — matches LoginFlow style */
    <div
      className="relative overflow-hidden rounded-2xl px-8 py-9 shadow-2xl"
      style={{
        background: 'rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* GP mark watermark */}
      <div className="pointer-events-none absolute -right-8 -bottom-8 opacity-[0.06]" aria-hidden="true">
        <img src={MARK_SRC} alt="" className="w-48 h-auto" />
      </div>

      {/* Logo */}
      <div className="mb-7 flex justify-center">
        <img src={LOGO_SRC} alt="GiantPay" className="h-14 w-auto object-contain" />
      </div>

      <h1 className="text-2xl font-bold text-white tracking-tight">Verify it's you</h1>
      <p className="mt-1 text-sm text-white/55">
        Enter the {current.codeLength}-digit code from your authenticator app.
      </p>

      {expired && (
        <div className="mt-4">
          <Alert variant="warning">This code has expired. Request a new one below.</Alert>
        </div>
      )}
      {!expired && errorMessage && (
        <div className="mt-4">
          <Alert variant="danger">{errorMessage}</Alert>
        </div>
      )}

      {/* OTP digit inputs */}
      <div className="mt-6 flex justify-between gap-2" role="group" aria-label="Verification code">
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
            className={
              'h-12 w-11 rounded-lg border text-center text-xl font-semibold tabular-nums text-white transition-colors ' +
              'bg-white/10 border-white/20 focus:border-white/60 focus:bg-white/20 focus:outline-none ' +
              'disabled:opacity-40 disabled:cursor-not-allowed'
            }
          />
        ))}
      </div>

      <p className="mt-3 text-xs text-white/40" aria-live="polite">
        {expired ? 'Code expired' : `Expires in ${expiresLabel}`}
      </p>

      <Button
        className="mt-5 w-full !bg-[#1a6dcc] hover:!bg-[#1460b4] !shadow-[0_4px_20px_rgba(26,109,204,0.4)]"
        disabled={code.length !== current.codeLength || expired}
        loading={verify.isPending}
        onClick={handleVerify}
      >
        Verify
      </Button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendInMs > 0 || resend.isPending}
          className="font-medium text-[#c9a227] hover:text-[#e0b83a] transition-colors disabled:text-white/30 disabled:cursor-not-allowed"
        >
          {resendInMs > 0 ? `Resend in ${Math.ceil(resendInMs / 1000)}s` : 'Resend code'}
        </button>
        <span className="text-white/35">Lost access? Use a recovery code.</span>
      </div>
    </div>
  );
}
