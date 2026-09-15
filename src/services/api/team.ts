import { api, type RequestOptions } from './client';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  deliveryToken?: string;
}

export interface MerchantRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  systemRole: boolean;
  memberCount?: number;
}

export const teamApi = {
  listMembers(params?: { page?: number; pageSize?: number }, options?: RequestOptions): Promise<{ items: TeamMember[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    return api.get<{ items: TeamMember[]; total: number }>(`/team/members${qs ? `?${qs}` : ''}`, options);
  },

  getMember(id: string, options?: RequestOptions): Promise<TeamMember> {
    return api.get<TeamMember>(`/team/members/${id}`, options);
  },

  changeRole(id: string, role: string, options?: RequestOptions): Promise<TeamMember> {
    return api.patch<TeamMember>(`/team/members/${id}/role`, { role }, options);
  },

  suspendMember(id: string, options?: RequestOptions): Promise<{ suspended: boolean }> {
    return api.post<{ suspended: boolean }>(`/team/members/${id}/suspend`, {}, options);
  },

  reactivateMember(id: string, options?: RequestOptions): Promise<{ reactivated: boolean }> {
    return api.post<{ reactivated: boolean }>(`/team/members/${id}/reactivate`, {}, options);
  },

  removeMember(id: string, options?: RequestOptions): Promise<{ removed: boolean }> {
    return api.post<{ removed: boolean }>(`/team/members/${id}/remove`, {}, options);
  },

  listInvitations(options?: RequestOptions): Promise<{ items: TeamInvitation[]; total: number }> {
    return api.get<{ items: TeamInvitation[]; total: number }>('/team/invitations', options);
  },

  createInvitation(data: { email: string; role: string }, options?: RequestOptions): Promise<TeamInvitation> {
    return api.post<TeamInvitation>('/team/invitations', data, options);
  },

  cancelInvitation(id: string, options?: RequestOptions): Promise<{ cancelled: boolean }> {
    return api.post<{ cancelled: boolean }>(`/team/invitations/${id}/cancel`, {}, options);
  },

  resendInvitation(id: string, options?: RequestOptions): Promise<TeamInvitation> {
    return api.post<TeamInvitation>(`/team/invitations/${id}/resend`, {}, options);
  },

  listRoles(options?: RequestOptions): Promise<{ items: MerchantRole[]; total: number }> {
    return api.get<{ items: MerchantRole[]; total: number }>('/roles', options);
  },

  createRole(data: { name: string; description?: string; permissions: string[] }, options?: RequestOptions): Promise<MerchantRole> {
    return api.post<MerchantRole>('/roles', data, options);
  },

  updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }, options?: RequestOptions): Promise<MerchantRole> {
    return api.patch<MerchantRole>(`/roles/${id}`, data, options);
  },

  archiveRole(id: string, options?: RequestOptions): Promise<{ archived: boolean }> {
    return api.post<{ archived: boolean }>(`/roles/${id}/archive`, {}, options);
  },
};
