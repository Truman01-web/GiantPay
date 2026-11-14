import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api/admin';

// --- Compliance Applications --------------------------------------------------

export function useComplianceApplications(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['admin', 'compliance', 'applications', params],
    queryFn: ({ signal }) => adminApi.listComplianceApplications(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useComplianceApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'compliance', 'application', id],
    queryFn: ({ signal }) => adminApi.getComplianceApplication(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useComplianceDecisions(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'compliance', 'decisions', id],
    queryFn: ({ signal }) => adminApi.listComplianceDecisions(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useBeginReview(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.beginComplianceReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'application', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'decisions', id] });
    },
  });
}

export function useRequestInformation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { note: string; fields?: string[] }) =>
      adminApi.requestComplianceInformation(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'application', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'decisions', id] });
    },
  });
}

export function useClassifyRisk(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED'; note?: string }) =>
      adminApi.classifyComplianceRisk(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'application', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'decisions', id] });
    },
  });
}

export function useApproveApplication(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.approveComplianceApplication(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'application', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'decisions', id] });
    },
  });
}

export function useRejectApplication(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { reason: string; note: string }) =>
      adminApi.rejectComplianceApplication(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'application', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'decisions', id] });
    },
  });
}

export function useSuspendApplication(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { reason: string }) =>
      adminApi.suspendComplianceApplication(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'application', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'compliance', 'decisions', id] });
    },
  });
}

// --- Refund Approvals ---------------------------------------------------------

export function usePendingRefunds(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['admin', 'refunds', 'pending', params],
    queryFn: ({ signal }) => adminApi.listPendingRefundApprovals(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useDecideRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVE' | 'REJECT'; note: string }) =>
      adminApi.decideRefund(id, { decision, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds', 'pending'] });
    },
  });
}

// --- Audit Events -------------------------------------------------------------

export function useAuditEvents(params?: { page?: number; pageSize?: number; action?: string; resourceType?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: ({ signal }) => adminApi.listAuditEvents(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

// --- System Health ------------------------------------------------------------

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: ({ signal }) => adminApi.getSystemHealth({ signal }),
    refetchInterval: 30_000,
  });
}
