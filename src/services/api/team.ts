import { api, type RequestOptions } from './client';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REMOVED';
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  roleId: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
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
  status: 'ACTIVE' | 'ARCHIVED';
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

  changeRole(id: string, roleId: string, options?: RequestOptions): Promise<TeamMember> {
    return api.patch<TeamMember>(`/team/members/${id}/role`, { roleId }, options);
  },

  suspendMember(id: string, options?: RequestOptions): Promise<{ id: string; status: 'SUSPENDED' }> {
    return api.post<{ id: string; status: 'SUSPENDED' }>(`/team/members/${id}/suspend`, {}, options);
  },

  reactivateMember(id: string, options?: RequestOptions): Promise<{ id: string; status: 'ACTIVE' }> {
    return api.post<{ id: string; status: 'ACTIVE' }>(`/team/members/${id}/reactivate`, {}, options);
  },

  removeMember(id: string, options?: RequestOptions): Promise<{ id: string; status: 'REMOVED' }> {
    return api.post<{ id: string; status: 'REMOVED' }>(`/team/members/${id}/remove`, {}, options);
  },

  listInvitations(options?: RequestOptions): Promise<{ items: TeamInvitation[]; total: number }> {
    return api.get<{ items: TeamInvitation[]; total: number }>('/team/invitations', options);
  },

  createInvitation(data: { email: string; roleId: string }, options?: RequestOptions): Promise<TeamInvitation> {
    return api.post<TeamInvitation>('/team/invitations', data, options);
  },

  cancelInvitation(id: string, options?: RequestOptions): Promise<TeamInvitation> {
    return api.post<TeamInvitation>(`/team/invitations/${id}/cancel`, {}, options);
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

  archiveRole(id: string, options?: RequestOptions): Promise<{ status: 'ARCHIVED' }> {
    return api.post<{ status: 'ARCHIVED' }>(`/roles/${id}/archive`, {}, options);
  },
};
