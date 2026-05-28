import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type {
  CreateManualTimeEntryInput,
  CreateTaskInput,
  CurrentTimeEntryResponse,
  ProjectResponse,
  TaskResponse,
  TimeEntryListQuery,
  TimeEntryListResponse,
  TimeEntryResponse,
  UpdateTaskInput,
  UpdateTimeEntryInput,
} from "@gitiempo/shared";
import {
  isQueryEnabled,
  type QueryAccessOptions,
} from "@gitiempo/web-shared/query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import {
  timeEntriesKeys,
  timerKeys,
  userMutationInvalidationKeys,
  userProjectsKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";

type QueryKey = readonly unknown[];

/* eslint-disable no-unused-vars */
interface CreateManualTimeEntryClient {
  createManualEntry(
    input: CreateManualTimeEntryInput,
  ): Promise<TimeEntryResponse>;
}

interface CreateTaskClient {
  createTask(
    projectId: string,
    input: CreateTaskInput,
  ): Promise<TaskResponse>;
}

interface CurrentTimerClient {
  getCurrentTimer(): Promise<CurrentTimeEntryResponse>;
}

interface DeleteTaskClient {
  deleteTask(taskId: string): Promise<void>;
}

interface DeleteTimeEntryClient {
  deleteEntry(entryId: string): Promise<void>;
}

interface OwnTimeEntriesClient {
  listOwnEntries(
    query?: Partial<TimeEntryListQuery>,
  ): Promise<TimeEntryListResponse>;
}

interface ProjectTasksClient {
  listProjectTasks(projectId: string): Promise<TaskResponse[]>;
}

interface StartTimerClient {
  startTimer(taskId: string): Promise<TimeEntryResponse>;
}

interface StopTimerClient {
  stopTimer(): Promise<TimeEntryResponse>;
}

interface UpdateTaskClient {
  updateTask(
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskResponse>;
}

interface UpdateTimeEntryClient {
  updateEntry(
    entryId: string,
    input: UpdateTimeEntryInput,
  ): Promise<TimeEntryResponse>;
}

interface VisibleProjectsClient {
  listVisibleProjects(): Promise<ProjectResponse[]>;
}
/* eslint-enable no-unused-vars */

interface UserScopedQueryOptions extends QueryAccessOptions {
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

interface UserScopedMutationOptions {
  accessToken: MaybeRefOrGetter<string | null | undefined>;
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

interface UseCurrentTimerQueryOptions extends UserScopedQueryOptions {
  client: CurrentTimerClient;
}

interface UseOwnTimeEntriesQueryOptions extends UserScopedQueryOptions {
  client: OwnTimeEntriesClient;
  query: MaybeRefOrGetter<Partial<TimeEntryListQuery>>;
  queryKey?: MaybeRefOrGetter<QueryKey>;
}

interface UseProjectTasksQueryOptions extends UserScopedQueryOptions {
  client: ProjectTasksClient;
  projectId: MaybeRefOrGetter<string | null | undefined>;
  queryKey?: MaybeRefOrGetter<QueryKey>;
}

interface UseVisibleProjectsQueryOptions extends UserScopedQueryOptions {
  client: VisibleProjectsClient;
  queryKey?: MaybeRefOrGetter<QueryKey>;
}

interface UseCreateManualTimeEntryMutationOptions extends UserScopedMutationOptions {
  client: CreateManualTimeEntryClient;
}

interface UseCreateTaskMutationOptions extends UserScopedMutationOptions {
  client: CreateTaskClient;
}

interface UseDeleteTaskMutationOptions extends UserScopedMutationOptions {
  client: DeleteTaskClient;
}

interface UseDeleteTimeEntryMutationOptions extends UserScopedMutationOptions {
  client: DeleteTimeEntryClient;
}

interface UseStartTimerMutationOptions extends UserScopedMutationOptions {
  client: StartTimerClient;
}

interface UseStopTimerMutationOptions extends UserScopedMutationOptions {
  client: StopTimerClient;
}

interface UseUpdateTaskMutationOptions extends UserScopedMutationOptions {
  client: UpdateTaskClient;
}

interface UseUpdateTimeEntryMutationOptions extends UserScopedMutationOptions {
  client: UpdateTimeEntryClient;
}

const recentOwnTimeEntriesQuery = { limit: 10, page: 1 } as const;

function requireProjectId(projectId: string | null | undefined): string {
  if (!projectId) {
    throw new Error("Project is required to load tasks.");
  }

  return projectId;
}

async function invalidateQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  keys: QueryKey[],
): Promise<void> {
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export const useCurrentTimerQuery = (options: UseCurrentTimerQueryOptions) =>
  useQuery({
    queryKey: computed(() => timerKeys.current(toValue(options.scope))),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.getCurrentTimer(),
  });

export const useOwnTimeEntriesQuery = (options: UseOwnTimeEntriesQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ??
      timeEntriesKeys.list(toValue(options.scope), toValue(options.query)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listOwnEntries(toValue(options.query)),
  });

export const useProjectTasksQuery = (options: UseProjectTasksQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ??
      userProjectsKeys.projectTasks(
        toValue(options.scope),
        toValue(options.projectId),
      ),
    ),
    enabled: computed(() => isQueryEnabled(options) && Boolean(toValue(options.projectId))),
    queryFn: () =>
      options.client.listProjectTasks(
        requireProjectId(toValue(options.projectId)),
      ),
  });

export const useRecentOwnTimeEntriesQuery = (
  options: Omit<UseOwnTimeEntriesQueryOptions, "query">,
) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ??
      timeEntriesKeys.list(toValue(options.scope), recentOwnTimeEntriesQuery),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listOwnEntries(recentOwnTimeEntriesQuery),
  });

export const useVisibleProjectsQuery = (options: UseVisibleProjectsQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ?? userProjectsKeys.visibleProjects(toValue(options.scope)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listVisibleProjects(),
  });

export const useCreateManualTimeEntryMutation = (
  options: UseCreateManualTimeEntryMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualTimeEntryInput) =>
      options.client.createManualEntry(input),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTimeEntryMutation(toValue(options.scope)),
      );
    },
  });
};

export const useCreateTaskMutation = (options: UseCreateTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateTaskInput }) =>
      options.client.createTask(projectId, input),
    onSuccess: async (_task, { projectId }) => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTaskMutation(toValue(options.scope), projectId),
      );
    },
  });
};

export const useDeleteTaskMutation = (options: UseDeleteTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { projectId: string; taskId: string }) =>
      options.client.deleteTask(taskId),
    onSuccess: async (_result, { projectId }) => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTaskMutation(toValue(options.scope), projectId),
      );
    },
  });
};

export const useDeleteTimeEntryMutation = (
  options: UseDeleteTimeEntryMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) =>
      options.client.deleteEntry(entryId),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTimeEntryMutation(toValue(options.scope)),
      );
    },
  });
};

export const useStartTimerMutation = (options: UseStartTimerMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      options.client.startTimer(taskId),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTimerMutation(toValue(options.scope)),
      );
    },
  });
};

export const useStopTimerMutation = (options: UseStopTimerMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => options.client.stopTimer(),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTimerMutation(toValue(options.scope)),
      );
    },
  });
};

export const useUpdateTaskMutation = (options: UseUpdateTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { projectId: string; taskId: string; input: UpdateTaskInput }) =>
      options.client.updateTask(taskId, input),
    onSuccess: async (task, { projectId }) => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTaskMutation(
          toValue(options.scope),
          task.projectId || projectId,
        ),
      );
    },
  });
};

export const useUpdateTimeEntryMutation = (
  options: UseUpdateTimeEntryMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: UpdateTimeEntryInput }) =>
      options.client.updateEntry(entryId, input),
    onSuccess: async () => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTimeEntryMutation(toValue(options.scope)),
      );
    },
  });
};
