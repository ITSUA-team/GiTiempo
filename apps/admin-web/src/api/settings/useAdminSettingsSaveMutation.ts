import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UpdateWorkspaceInput, UpdateWorkspaceSettingsInput } from '@gitiempo/shared';

import {
  adminMutationInvalidationKeys,
  type AdminServerStateScope,
} from '@/lib/query-keys';
import type { AdminSettingsClient } from '@/services/admin-settings-client';

type AdminSettingsSaveClient = Pick<
  AdminSettingsClient,
  'updateWorkspace' | 'updateWorkspaceSettings'
>;

interface UseAdminSettingsSaveMutationOptions {
  client: AdminSettingsSaveClient;
  scope: () => AdminServerStateScope;
  token: () => string;
}

export function useAdminSettingsSaveMutation(
  options: UseAdminSettingsSaveMutationOptions,
) {
  const queryClient = useQueryClient();

  async function invalidateSettings(): Promise<void> {
    await Promise.all(
      adminMutationInvalidationKeys
        .afterSettingsSave(options.scope())
        .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

  const updateWorkspaceMutation = useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      options.client.updateWorkspace(options.token(), input),
    onSuccess: invalidateSettings,
  });
  const updateWorkspaceSettingsMutation = useMutation({
    mutationFn: (input: UpdateWorkspaceSettingsInput) =>
      options.client.updateWorkspaceSettings(options.token(), input),
    onSuccess: invalidateSettings,
  });

  return {
    updateWorkspace: updateWorkspaceMutation.mutateAsync,
    updateWorkspaceMutation,
    updateWorkspaceSettings: updateWorkspaceSettingsMutation.mutateAsync,
    updateWorkspaceSettingsMutation,
  };
}
