import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { authApi } from '@/services/api/auth';

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
    <Card>
      <CardContent className="text-center">
        {status === 'success' ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--color-green-600)]" aria-hidden="true" />
            <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">Email verified</h1>
            <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">You can now sign in to GiantPay.</p>
            <Button asChild className="mt-4">
              <Link to="/login">Sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-[var(--color-red-600)]" aria-hidden="true" />
            <h1 className="mt-3 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">This link is invalid or expired</h1>
            <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">Sign in and request a new verification email.</p>
            <Button asChild variant="secondary" className="mt-4">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
