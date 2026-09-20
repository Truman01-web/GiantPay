import { api, type RequestOptions } from './client';

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_MERCHANT' | 'WAITING_FOR_INTERNAL' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type SupportPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type SupportCategory = 'ACCOUNT' | 'ONBOARDING' | 'PAYMENT' | 'REFUND' | 'SETTLEMENT' | 'RECONCILIATION' | 'API_INTEGRATION' | 'WEBHOOK' | 'SECURITY' | 'OTHER';

export interface SupportCase {
  id: string;
  reference: string;
  merchantId: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  assignedOwner: { id: string; name: string } | null;
  linkedTransaction: { id: string; reference: string; merchantReference: string | null; status: string } | null;
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolutionSummary: string | null;
}

export interface SupportActivity {
  id: string;
  type: 'MESSAGE' | 'NOTE' | 'STATUS' | 'ASSIGNMENT' | 'PRIORITY';
  visibility: 'MERCHANT' | 'INTERNAL';
  actorId: string;
  authorDomain?: 'MERCHANT' | 'PLATFORM';
  body: string;
  from?: string | null;
  to?: string | null;
  createdAt: string;
}

export interface SupportCaseDetail extends SupportCase {
  description: string;
  merchant?: { id: string; name: string };
  timeline: SupportActivity[];
}

export interface SupportListParams {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  assignedTo?: string;
  from?: string;
  to?: string;
  sort?: 'updatedAt' | 'createdAt';
  direction?: 'asc' | 'desc';
}

export interface SupportPage {
  data: SupportCase[];
  total: number;
  nextCursor: string | null;
}

function query(params: SupportListParams): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== '') search.set(name, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

const mutationOptions = (): RequestOptions => ({ idempotencyKey: crypto.randomUUID() });

export const supportApi = {
  list(params: SupportListParams, options?: RequestOptions): Promise<SupportPage> {
    return api.get<SupportPage>(`/support/cases${query(params)}`, options);
  },
  get(id: string, options?: RequestOptions): Promise<SupportCaseDetail> {
    return api.get<SupportCaseDetail>(`/support/cases/${encodeURIComponent(id)}`, options);
  },
  create(data: { subject: string; category: SupportCategory; message: string; transactionId?: string }): Promise<SupportCase> {
    return api.post<SupportCase>('/support/cases', data, mutationOptions());
  },
  reply(id: string, message: string): Promise<{ id: string }> {
    return api.post(`/support/cases/${encodeURIComponent(id)}/replies`, { message }, mutationOptions());
  },
  listPlatform(params: SupportListParams & { merchantId?: string }, options?: RequestOptions): Promise<SupportPage> {
    return api.get<SupportPage>(`/platform/support/cases${query(params)}`, options);
  },
  getPlatform(id: string, options?: RequestOptions): Promise<SupportCaseDetail> {
    return api.get<SupportCaseDetail>(`/platform/support/cases/${encodeURIComponent(id)}`, options);
  },
  listAssignees(options?: RequestOptions): Promise<{ items: Array<{ id: string; name: string }> }> {
    return api.get('/platform/support/assignees', options);
  },
  platformReply(id: string, message: string): Promise<{ id: string }> {
    return api.post(`/platform/support/cases/${encodeURIComponent(id)}/replies`, { message }, mutationOptions());
  },
  internalNote(id: string, message: string): Promise<{ id: string }> {
    return api.post(`/platform/support/cases/${encodeURIComponent(id)}/internal-notes`, { message }, mutationOptions());
  },
  assign(id: string, data: { staffId: string; expectedAssigneeId: string | null; reason: string }): Promise<SupportCase> {
    return api.post(`/platform/support/cases/${encodeURIComponent(id)}/assign`, data, mutationOptions());
  },
  changePriority(id: string, data: { priority: SupportPriority; expectedPriority: SupportPriority; reason: string }): Promise<SupportCase> {
    return api.post(`/platform/support/cases/${encodeURIComponent(id)}/priority`, data, mutationOptions());
  },
  changeStatus(id: string, data: { status: SupportStatus; expectedStatus: SupportStatus; reason: string }): Promise<SupportCase> {
    return api.post(`/platform/support/cases/${encodeURIComponent(id)}/status`, data, mutationOptions());
  },
};
