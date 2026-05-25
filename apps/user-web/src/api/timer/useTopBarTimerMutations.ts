import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";

import {
  userMutationInvalidationKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";

type TopBarTimerMutationClient = Pick<
  TimeEntriesClient,
  "createTask" | "startTimer" | "stopTimer"
>;
type CreateTaskInput = Parameters<TimeEntriesClient["createTask"]>[2];

interface UseTopBarTimerMutationsOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  client: TopBarTimerMutationClient;
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

function requireAccessToken(accessToken: string | null | undefined): string {
  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return accessToken;
}

export function useTopBarTimerMutations(options: UseTopBarTimerMutationsOptions) {
  const queryClient = useQueryClient();

  async function invalidateTimerSurfaces(): Promise<void> {
    await Promise.all(
      userMutationInvalidationKeys
        .afterTimerMutation(toValue(options.scope))
        .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  }

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

  const startTimerMutation = useMutation({
    mutationFn: (taskId: string) =>
      options.client.startTimer(
        requireAccessToken(toValue(options.accessToken)),
        taskId,
      ),
    onSuccess: invalidateTimerSurfaces,
  });

  const stopTimerMutation = useMutation({
    mutationFn: () =>
      options.client.stopTimer(
        requireAccessToken(toValue(options.accessToken)),
      ),
    onSuccess: invalidateTimerSurfaces,
  });

  return {
    createTask: createTaskMutation.mutateAsync,
    createTaskMutation,
    startTimer: startTimerMutation.mutateAsync,
    startTimerMutation,
    stopTimer: stopTimerMutation.mutateAsync,
    stopTimerMutation,
  };
}
