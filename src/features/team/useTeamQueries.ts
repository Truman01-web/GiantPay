import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamApi } from '@/services/api/team';

const teamKey = ['team'] as const;
const rolesKey = ['roles'] as const;

export function useMembers() {
  return useQuery({ queryKey: [...teamKey, 'members'], queryFn: ({ signal }) => teamApi.listMembers({ page: 1, pageSize: 100 }, { signal }) });
}
export function useInvitations() {
  return useQuery({ queryKey: [...teamKey, 'invitations'], queryFn: ({ signal }) => teamApi.listInvitations({ signal }) });
}
export function useRoles() {
  return useQuery({ queryKey: rolesKey, queryFn: ({ signal }) => teamApi.listRoles({ signal }) });
}

export function useTeamActions() {
  const client = useQueryClient();
  const refreshTeam = () => client.invalidateQueries({ queryKey: teamKey });
  return {
    invite: useMutation({ mutationFn: (data: Parameters<typeof teamApi.createInvitation>[0]) => teamApi.createInvitation(data), onSuccess: refreshTeam }),
    resend: useMutation({ mutationFn: (id: string) => teamApi.resendInvitation(id), onSuccess: refreshTeam }),
    cancel: useMutation({ mutationFn: (id: string) => teamApi.cancelInvitation(id), onSuccess: refreshTeam }),
    changeRole: useMutation({ mutationFn: ({ id, roleId }: { id: string; roleId: string }) => teamApi.changeRole(id, roleId), onSuccess: refreshTeam }),
    suspend: useMutation({ mutationFn: (id: string) => teamApi.suspendMember(id), onSuccess: refreshTeam }),
    reactivate: useMutation({ mutationFn: (id: string) => teamApi.reactivateMember(id), onSuccess: refreshTeam }),
    remove: useMutation({ mutationFn: (id: string) => teamApi.removeMember(id), onSuccess: refreshTeam }),
  };
}

export function useRoleActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: rolesKey });
  return {
    create: useMutation({ mutationFn: (data: Parameters<typeof teamApi.createRole>[0]) => teamApi.createRole(data), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof teamApi.updateRole>[1] }) => teamApi.updateRole(id, data), onSuccess: refresh }),
    archive: useMutation({ mutationFn: (id: string) => teamApi.archiveRole(id), onSuccess: refresh }),
  };
}
