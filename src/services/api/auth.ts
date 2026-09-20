import type { MfaChallenge, Session } from '@/types/auth';
import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResult {
  status: 'AUTHENTICATED' | 'MFA_REQUIRED';
  session?: Session;
  mfaChallenge?: MfaChallenge;
}

export interface RegistrationResult {
  accepted: true;
  verificationRequired: true;
  challengeId?: string;
  maskedDestination?: string;
  expiresAt?: string;
  resendAvailableAt?: string;
  delivery: { available: boolean; queued: boolean };
}

export const authApi = {
  login: (payload: LoginRequest) => apiClient.post<LoginResult>('/auth/login', payload),

  verifyMfa: (payload: { challengeId: string; code: string }) =>
    apiClient.post<{ session: Session }>('/auth/mfa/verify', payload),

  logout: () => apiClient.post<void>('/auth/logout'),

  getSession: (options?: { signal?: AbortSignal }) =>
    apiClient.get<{ session: Session | null }>('/auth/session', options),

  forgotPassword: (payload: { email: string }) =>
    apiClient.post<{ accepted: true }>('/auth/password/forgot', payload),

  resetPassword: (payload: { token: string; password: string }) =>
    apiClient.post<{ accepted: true }>('/auth/password/reset', payload),

  verifyEmail: (payload: { token: string }) =>
    apiClient.post<{ verified: true }>('/auth/email/verify', payload),

  register: (payload: { businessName: string; email: string; password: string; phone: string }) =>
    apiClient.post<RegistrationResult>('/auth/register', payload),

  verifyRegistrationOtp: (payload: { challengeId: string; code: string }) =>
    apiClient.post<{ verified: true }>('/auth/registration/verify', payload),

  resendRegistrationOtp: (payload: { challengeId: string }) =>
    apiClient.post<RegistrationResult>('/auth/registration/resend', payload),
};
