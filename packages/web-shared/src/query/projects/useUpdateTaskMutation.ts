import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { TaskResponse, UpdateTaskInput } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";

/* eslint-disable no-unused-vars */
interface UpdateTaskClient {
  updateTask(
    accessToken: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskResponse>;
}
/* eslint-enable no-unused-vars */

interface UseUpdateTaskMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: UpdateTaskClient;
}

export const useUpdateTaskMutation = (options: UseUpdateTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { projectId: string; taskId: string; input: UpdateTaskInput }) =>
      options.client.updateTask(
        requireAccessToken(toValue(options.accessToken)),
        taskId,
        input,
      ),
    onSuccess: async (task, { projectId }) => {
      await queryClient.invalidateQueries({
        queryKey: ["project_tasks", task.projectId || projectId],
      });
    },
  });
};
