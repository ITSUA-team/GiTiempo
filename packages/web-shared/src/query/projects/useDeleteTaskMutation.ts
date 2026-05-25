import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

/* eslint-disable no-unused-vars */
interface DeleteTaskClient {
  deleteTask(accessToken: string, taskId: string): Promise<void>;
}
/* eslint-enable no-unused-vars */

interface UseDeleteTaskMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: DeleteTaskClient;
}

export const useDeleteTaskMutation = (options: UseDeleteTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { projectId: string; taskId: string }) =>
      options.client.deleteTask(
        requireAccessToken(toValue(options.accessToken)),
        taskId,
      ),
    onSuccess: async (_result, { projectId }) => {
      await queryClient.invalidateQueries({ queryKey: ["project_tasks", projectId] });
    },
  });
};
