import { api, type RequestOptions } from './client';

export interface ComplianceApplication {
  id: string;
  merchantId: string;
  businessName: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'INFO_REQUESTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED' | null;
  submittedAt: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  businessType?: string;
  registrationNumber?: string;
  taxNumber?: string;
  addresses?: Array<{ type: string; addressLine1: string; city: string; country: string }>;
  directors?: Array<{ fullName: string; nationality: string; isPep: boolean }>;
  beneficialOwners?: Array<{ fullName: string; percentageBasisPoints: number }>;
  declarations?: Record<string, boolean>;
  evidenceFiles?: Array<{ id: string; category: string; originalFilename: string }>;
}

export interface ComplianceDecision {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  note: string | null;
  createdAt: string;
}

export interface PendingRefund {
  id: string;
  paymentId: string;
  paymentReference: string;
  customerName: string;
  amountMinor: number;
  currency: string;
  reason: string;
  requestedBy: { id: string; name: string };
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorEmail?: string;
  merchantId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'unavailable';
  database: boolean;
  rateLimiter: boolean;
  workers: boolean;
  timestamp: string;
}

export const adminApi = {
  listComplianceApplications(params?: { page?: number; pageSize?: number }, options?: RequestOptions): Promise<{ items: ComplianceApplication[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    return api.get<{ items: ComplianceApplication[]; total: number }>(`/compliance/applications${qs ? `?${qs}` : ''}`, options);
  },

  getComplianceApplication(id: string, options?: RequestOptions): Promise<ComplianceApplication> {
    return api.get<ComplianceApplication>(`/compliance/applications/${id}`, options);
  },

  beginComplianceReview(id: string, options?: RequestOptions): Promise<{ status: string }> {
    return api.post<{ status: string }>(`/compliance/applications/${id}/review`, {}, options);
  },

  requestComplianceInformation(id: string, data: { note: string; fields?: string[] }, options?: RequestOptions): Promise<{ status: string }> {
    return api.post<{ status: string }>(`/compliance/applications/${id}/information-requests`, data, options);
  },

  classifyComplianceRisk(id: string, data: { riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED'; note?: string }, options?: RequestOptions): Promise<{ riskLevel: string }> {
    return api.post<{ riskLevel: string }>(`/compliance/applications/${id}/risk-classifications`, data, options);
  },

  approveComplianceApplication(id: string, options?: RequestOptions): Promise<{ status: string }> {
    return api.post<{ status: string }>(`/compliance/applications/${id}/approve`, {}, options);
  },

  rejectComplianceApplication(id: string, data: { reason: string; note: string }, options?: RequestOptions): Promise<{ status: string }> {
    return api.post<{ status: string }>(`/compliance/applications/${id}/reject`, data, options);
  },

  suspendComplianceApplication(id: string, data: { reason: string }, options?: RequestOptions): Promise<{ status: string }> {
    return api.post<{ status: string }>(`/compliance/applications/${id}/suspend`, data, options);
  },

  listComplianceDecisions(id: string, options?: RequestOptions): Promise<{ items: ComplianceDecision[] }> {
    return api.get<{ items: ComplianceDecision[] }>(`/compliance/applications/${id}/decisions`, options);
  },

  listPendingRefundApprovals(params?: { page?: number; pageSize?: number }, options?: RequestOptions): Promise<{ items: PendingRefund[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    return api.get<{ items: PendingRefund[]; total: number }>(`/admin/refunds/pending${qs ? `?${qs}` : ''}`, options);
  },

  decideRefund(id: string, data: { decision: 'APPROVE' | 'REJECT'; note: string }, options?: RequestOptions): Promise<{ status: string }> {
    return api.post<{ status: string }>(`/admin/refunds/${id}/decision`, data, options);
  },

  listAuditEvents(params?: { page?: number; pageSize?: number; action?: string; resourceType?: string }, options?: RequestOptions): Promise<{ items: AuditEvent[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.action) query.set('action', params.action);
    if (params?.resourceType) query.set('resourceType', params.resourceType);
    const qs = query.toString();
    return api.get<{ items: AuditEvent[]; total: number }>(`/audit-events${qs ? `?${qs}` : ''}`, options);
  },

  getSystemHealth(options?: RequestOptions): Promise<SystemHealth> {
    return api.get<SystemHealth>('/health', options);
  },
};
