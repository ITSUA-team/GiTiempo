import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { UpdateWorkspaceSettingsInput, WorkspaceSettingsResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { workspaceQueryKeys } from "../keys";

/* eslint-disable no-unused-vars */
interface UpdateWorkspaceSettingsClient {
  updateWorkspaceSettings(
    accessToken: string,
    input: UpdateWorkspaceSettingsInput,
  ): Promise<WorkspaceSettingsResponse>;
}
/* eslint-enable no-unused-vars */

interface UseUpdateWorkspaceSettingsMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: UpdateWorkspaceSettingsClient;
}

export const useUpdateWorkspaceSettingsMutation = (
  options: UseUpdateWorkspaceSettingsMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceSettingsInput) =>
      options.client.updateWorkspaceSettings(
        requireAccessToken(toValue(options.accessToken)),
        input,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.settings });
    },
  });
};
