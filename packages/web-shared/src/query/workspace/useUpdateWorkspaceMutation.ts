import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { UpdateWorkspaceInput, WorkspaceResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { workspaceQueryKeys } from "../keys";

/* eslint-disable no-unused-vars */
interface UpdateWorkspaceClient {
  updateWorkspace(
    accessToken: string,
    input: UpdateWorkspaceInput,
  ): Promise<WorkspaceResponse>;
}
/* eslint-enable no-unused-vars */

interface UseUpdateWorkspaceMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: UpdateWorkspaceClient;
}

export const useUpdateWorkspaceMutation = (options: UseUpdateWorkspaceMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      options.client.updateWorkspace(
        requireAccessToken(toValue(options.accessToken)),
        input,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.workspace });
    },
  });
};
