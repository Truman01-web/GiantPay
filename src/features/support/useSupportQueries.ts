import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi, type SupportListParams } from '@/services/api/support';

export const supportKeys = {
  all: ['support'] as const,
  lists: () => [...supportKeys.all, 'list'] as const,
  list: (platform: boolean, params: SupportListParams) => [...supportKeys.lists(), platform ? 'platform' : 'merchant', params] as const,
  detail: (platform: boolean, id: string) => [...supportKeys.all, 'detail', platform ? 'platform' : 'merchant', id] as const,
};

export function useSupportCases(params: SupportListParams, platform = false) {
  return useQuery({
    queryKey: supportKeys.list(platform, params),
    queryFn: ({ signal }) => platform ? supportApi.listPlatform(params, { signal }) : supportApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useSupportCase(id: string, platform = false) {
  return useQuery({
    queryKey: supportKeys.detail(platform, id),
    queryFn: ({ signal }) => platform ? supportApi.getPlatform(id, { signal }) : supportApi.get(id, { signal }),
    enabled: Boolean(id),
  });
}

export function useSupportAssignees(enabled: boolean) {
  return useQuery({ queryKey: [...supportKeys.all, 'assignees'], queryFn: ({ signal }) => supportApi.listAssignees({ signal }), enabled });
}

export function useCreateSupportCase() {
  const client = useQueryClient();
  return useMutation({ mutationFn: supportApi.create, onSuccess: () => client.invalidateQueries({ queryKey: supportKeys.lists() }) });
}

export function useSupportActions(id: string, platform = false) {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: supportKeys.detail(platform, id) }),
      client.invalidateQueries({ queryKey: supportKeys.lists() }),
    ]);
  };
  return {
    reply: useMutation({ mutationFn: (message: string) => platform ? supportApi.platformReply(id, message) : supportApi.reply(id, message), onSuccess: refresh }),
    note: useMutation({ mutationFn: (message: string) => supportApi.internalNote(id, message), onSuccess: refresh }),
    assign: useMutation({ mutationFn: (data: Parameters<typeof supportApi.assign>[1]) => supportApi.assign(id, data), onSuccess: refresh }),
    priority: useMutation({ mutationFn: (data: Parameters<typeof supportApi.changePriority>[1]) => supportApi.changePriority(id, data), onSuccess: refresh }),
    status: useMutation({ mutationFn: (data: Parameters<typeof supportApi.changeStatus>[1]) => supportApi.changeStatus(id, data), onSuccess: refresh }),
  };
}
