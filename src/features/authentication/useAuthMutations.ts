import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginRequest } from '@/services/api/auth';
import { useSessionStore } from '@/services/auth/sessionStore';
import { toast } from '@/components/feedback/toastStore';

export function useLoginMutation() {
  const setSession = useSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (result) => {
      if (result.status === 'AUTHENTICATED' && result.session) {
        setSession(result.session);
      }
    },
  });
}

export function useMfaVerifyMutation() {
  const setSession = useSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: { challengeId: string; code: string }) => authApi.verifyMfa(payload),
    onSuccess: (result) => setSession(result.session),
  });
}

export function useLogoutMutation() {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Session end must clear every cached server-state query — nothing
      // sensitive should survive in memory after sign-out.
      setSession(null);
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: { email: string }) => authApi.forgotPassword(payload),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) => authApi.resetPassword(payload),
    onSuccess: () =>
      toast({
        variant: 'success',
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      }),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: {
      businessName: string;
      email: string;
      password: string;
      phone: string;
    }) => authApi.register(payload),
  });
}

export function useRegistrationOtpVerifyMutation() {
  return useMutation({
    mutationFn: (payload: { challengeId: string; code: string }) =>
      authApi.verifyRegistrationOtp(payload),
  });
}

export function useRegistrationOtpResendMutation() {
  return useMutation({
    mutationFn: (payload: { challengeId: string }) => authApi.resendRegistrationOtp(payload),
  });
}
