import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import {
  userMutationInvalidationKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

type ProjectTaskMutationClient = Pick<
  TimeEntriesClient,
  "createTask" | "deleteTask" | "updateTask"
>;
type CreateTaskInput = Parameters<TimeEntriesClient["createTask"]>[2];
type UpdateTaskInput = Parameters<TimeEntriesClient["updateTask"]>[2];

interface UseProjectTaskMutationsOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: ProjectTaskMutationClient;
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

function requireAccessToken(accessToken: string | null | undefined): string {
  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return accessToken;
}

export function useProjectTaskMutations(options: UseProjectTaskMutationsOptions) {
  const queryClient = useQueryClient();

  async function invalidateTaskSurfaces(projectId: string): Promise<void> {
    await Promise.all(
      userMutationInvalidationKeys
        .afterTaskMutation(toValue(options.scope), projectId)
        .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

  const createTaskMutation = useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateTaskInput }) =>
      options.client.createTask(
        requireAccessToken(toValue(options.accessToken)),
        projectId,
        input,
      ),
    onSuccess: async (_task, { projectId }) => invalidateTaskSurfaces(projectId),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      input,
      taskId,
    }: {
      input: UpdateTaskInput;
      projectId: string;
      taskId: string;
    }) =>
      options.client.updateTask(
        requireAccessToken(toValue(options.accessToken)),
        taskId,
        input,
      ),
    onSuccess: async (task, { projectId }) =>
      invalidateTaskSurfaces(task.projectId || projectId),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId }: { projectId: string; taskId: string }) =>
      options.client.deleteTask(
        requireAccessToken(toValue(options.accessToken)),
        taskId,
      ),
    onSuccess: async (_result, { projectId }) => invalidateTaskSurfaces(projectId),
  });

  return {
    createTask: createTaskMutation.mutateAsync,
    createTaskMutation,
    deleteTask: deleteTaskMutation.mutateAsync,
    deleteTaskMutation,
    updateTask: updateTaskMutation.mutateAsync,
    updateTaskMutation,
  };
}
