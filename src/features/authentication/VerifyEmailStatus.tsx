import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { authApi } from '@/services/api/auth';
import { LOGO_SRC, MARK_SRC } from '@/assets/brand';

const cardStyle: React.CSSProperties = {
  background: 'rgba(10, 28, 62, 0.58)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: '0 32px 64px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.22)',
};

const accentBar = (
  <div
    className="h-1.5 w-full rounded-t-2xl"
    style={{ background: 'linear-gradient(90deg, #1a6dcc 0%, #c9a227 50%, #c01c28 100%)' }}
  />
);

const wavingMark = (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
    <img
      src={MARK_SRC}
      alt=""
      className="animate-flag-wave-slow w-[300px] max-w-none opacity-[0.12] select-none object-contain"
      style={{ filter: 'drop-shadow(0 15px 35px rgba(201,162,39,0.25))' }}
    />
  </div>
);

export function VerifyEmailStatus() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(token ? 'verifying' : 'error');
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    authApi
      .verifyEmail({ token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'verifying') return <FullPageLoader label="Verifying your email…" />;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={cardStyle}>
      {wavingMark}
      {accentBar}
      <div className="relative z-10 px-8 py-10 text-center">
        <div className="mb-4 flex justify-center">
          <img src={LOGO_SRC} alt="GiantPay" className="h-16 w-auto object-contain drop-shadow-md" />
        </div>

        {status === 'success' ? (
          <>
            {/* Check circle as inline SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-14 w-14 text-emerald-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="mt-4 text-2xl font-bold text-white">Email verified!</h1>
            <p className="mt-2 text-sm text-white/60">You can now sign in to GiantPay.</p>
            <Button
              asChild
              className="mt-6 w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)',
                boxShadow: '0 4px 18px rgba(26,109,204,0.35)',
                border: 'none',
              }}
            >
              <Link to="/login">Sign in now</Link>
            </Button>
          </>
        ) : (
          <>
            {/* X circle as inline SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-14 w-14 text-red-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="mt-4 text-2xl font-bold text-white">This link is invalid or expired</h1>
            <p className="mt-2 text-sm text-white/60">Sign in and request a new verification email.</p>
            <Button
              asChild
              variant="secondary"
              className="mt-6 w-full rounded-xl py-2.5 text-sm font-semibold"
            >
              <Link to="/login">Back to sign in</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
