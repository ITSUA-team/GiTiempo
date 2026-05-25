import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { CreateTaskInput, TaskResponse } from "@gitiempo/shared";
import { toValue, type MaybeRefOrGetter } from "vue";

import { requireAccessToken } from "../access-token";
import { projectQueryKeys } from "../keys";

/* eslint-disable no-unused-vars */
interface CreateTaskClient {
  createTask(
    accessToken: string,
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse>;
}
/* eslint-enable no-unused-vars */

interface UseCreateTaskMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: CreateTaskClient;
}

export const useCreateTaskMutation = (options: UseCreateTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateTaskInput }) =>
      options.client.createTask(
        requireAccessToken(toValue(options.accessToken)),
        projectId,
        input,
      ),
    onSuccess: async (_task, { projectId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.projectTasks(projectId) }),
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.visibleProjects }),
      ]);
    },
  });
};
