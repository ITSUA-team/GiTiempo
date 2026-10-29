import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type {
  CreateManualTimeEntryInput,
  CreateTaskInput,
  CurrentTimeEntryResponse,
  ProjectResponse,
  StartTimerFromGitHubInput,
  StartTimerInput,
  ConditionalStopTimerInput,
  TaskResponse,
  TimeEntryListQuery,
  TimeEntryListResponse,
  TimeEntryResponse,
  UpdateTaskInput,
  UpdateTimeEntryInput,
} from "@gitiempo/shared";
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

import {
  timeEntriesKeys,
  timerKeys,
  userMutationInvalidationKeys,
  userProjectsKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import { USER_LIST_QUERY_POLICY } from "@/lib/query-policy";
import { reconcileTimeEntryListCaches } from "@/lib/time-entry-query-cache";
import type { SelectedTaskContext } from "@/lib/top-bar-timer-helpers";

type QueryKey = readonly unknown[];

interface UserMutationContext {
  scope: UserServerStateScope;
}

interface TimeEntryMutationContext extends UserMutationContext {
  hasUnknownSource: boolean;
  previousEntry: TimeEntryResponse | null;
}

interface TimerSummaryQueryData {
  currentTimer: TimeEntryResponse | null;
  selectedContext: SelectedTaskContext | null;
  selectedDescription: string | null;
}

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
  getCurrentTimer(options?: { signal?: AbortSignal }): Promise<CurrentTimeEntryResponse>;
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
    options?: { signal?: AbortSignal },
  ): Promise<TimeEntryListResponse>;
}

interface StartTimerClient {
  startTimer(input: StartTimerInput): Promise<TimeEntryResponse>;
}

interface StartTimerFromGitHubClient {
  startTimerFromGitHub(
    input: StartTimerFromGitHubInput,
  ): Promise<TimeEntryResponse>;
}

interface StopTimerClient {
  stopTimer(input: ConditionalStopTimerInput): Promise<TimeEntryResponse>;
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

interface UserScopedQueryOptions {
  enabled: MaybeRefOrGetter<boolean>;
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

interface UserScopedMutationOptions {
  scope: MaybeRefOrGetter<UserServerStateScope>;
}

interface UseCurrentTimerQueryOptions extends UserScopedQueryOptions {
  client: CurrentTimerClient;
  queryKey?: MaybeRefOrGetter<QueryKey>;
}

interface UseOwnTimeEntriesQueryOptions extends UserScopedQueryOptions {
  client: OwnTimeEntriesClient;
  query: MaybeRefOrGetter<Partial<TimeEntryListQuery>>;
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

interface UseStartTimerFromGitHubMutationOptions
  extends UserScopedMutationOptions {
  client: StartTimerFromGitHubClient;
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

function isQueryEnabled(options: UserScopedQueryOptions): boolean {
  return Boolean(toValue(options.enabled));
}

function isEntryInWorkspaceScope(
  scope: UserServerStateScope,
  entry: TimeEntryResponse,
): boolean {
  const workspaceId = scope.workspaceId?.trim();

  return !workspaceId || entry.workspaceId === workspaceId;
}

function belongsToScope(queryKey: QueryKey, scope: UserServerStateScope): boolean {
  return JSON.stringify(queryKey[1]) === JSON.stringify(timeEntriesKeys.all(scope)[1]);
}

function isSameScope(
  first: UserServerStateScope,
  second: UserServerStateScope,
): boolean {
  return JSON.stringify(timeEntriesKeys.all(first)[1]) ===
    JSON.stringify(timeEntriesKeys.all(second)[1]);
}

function readCachedEntry(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: UserServerStateScope,
  entryId: string,
): TimeEntryResponse | null {
  for (const query of queryClient.getQueryCache().findAll({
    queryKey: timeEntriesKeys.all(scope),
  })) {
    const data = query.state.data;
    const entries = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "items" in data && Array.isArray(data.items)
        ? data.items
        : [];
    const entry = entries.find(
      (item): item is TimeEntryResponse =>
        typeof item === "object" && item !== null && "id" in item && item.id === entryId,
    );

    if (entry) {
      return entry;
    }
  }

  return null;
}

function getAffectedProjectIds(
  previousEntry: TimeEntryResponse | null,
  entry: TimeEntryResponse | null,
): string[] {
  return [previousEntry?.projectId, entry?.projectId].filter(
    (projectId): projectId is string => Boolean(projectId),
  );
}

function hasUnknownAffectedProject(
  context: TimeEntryMutationContext,
  entry: TimeEntryResponse | null,
): boolean {
  return (
    context.hasUnknownSource &&
    getAffectedProjectIds(context.previousEntry, entry).length === 0
  );
}

function updateEntryTask(
  entry: TimeEntryResponse | null,
  task: TaskResponse,
): TimeEntryResponse | null {
  if (!entry || entry.taskId !== task.id) {
    return entry;
  }

  return {
    ...entry,
    task: {
      ...entry.task,
      title: task.title,
    },
  };
}

function updateSelectedTaskContext(
  context: SelectedTaskContext | null,
  task: TaskResponse,
): SelectedTaskContext | null {
  if (!context || context.source !== "local" || context.taskId !== task.id) {
    return context;
  }

  return {
    ...context,
    githubIssue: task.githubIssue,
    taskTitle: task.title,
  };
}

function reconcileTimerTaskCachesAfterTaskMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: UserServerStateScope,
  task: TaskResponse,
): void {
  queryClient.setQueryData<CurrentTimeEntryResponse>(
    timerKeys.currentRaw(scope),
    (current) => {
      if (!current) {
        return current;
      }

      const timeEntry = updateEntryTask(current.timeEntry, task);

      return timeEntry === current.timeEntry ? current : { ...current, timeEntry };
    },
  );
  queryClient.setQueryData<TimerSummaryQueryData>(
    timerKeys.summary(scope),
    (current) => {
      if (!current) {
        return current;
      }

      const currentTimer = updateEntryTask(current.currentTimer, task);
      const selectedContext = updateSelectedTaskContext(current.selectedContext, task);

      return currentTimer === current.currentTimer && selectedContext === current.selectedContext
        ? current
        : { ...current, currentTimer, selectedContext };
    },
  );
}

async function invalidateQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  keys: QueryKey[],
): Promise<void> {
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

async function invalidateTimeEntryMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  context: TimeEntryMutationContext,
  entry: TimeEntryResponse | null,
): Promise<void> {
  await queryClient.cancelQueries(
    { queryKey: timeEntriesKeys.all(context.scope) },
    { silent: true },
  );
  await invalidateQueryKeys(
    queryClient,
    userMutationInvalidationKeys.afterTimeEntryMutation(
      context.scope,
      getAffectedProjectIds(context.previousEntry, entry),
      context.hasUnknownSource,
    ),
  );
}

async function invalidateTimerMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  context: TimeEntryMutationContext,
  entry: TimeEntryResponse,
): Promise<void> {
  await queryClient.cancelQueries(
    { queryKey: timeEntriesKeys.all(context.scope) },
    { silent: true },
  );
  await invalidateQueryKeys(
    queryClient,
    userMutationInvalidationKeys.afterTimerMutation(
      context.scope,
      getAffectedProjectIds(context.previousEntry, entry),
      hasUnknownAffectedProject(context, entry),
    ),
  );
}

async function reconcileTimeEntryCachesAfterTimeEntryMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: UserServerStateScope,
  entry: TimeEntryResponse,
): Promise<void> {
  if (!isEntryInWorkspaceScope(scope, entry)) {
    return;
  }

  await queryClient.cancelQueries(
    { queryKey: timeEntriesKeys.all(scope) },
    { silent: true },
  );

  try {
    reconcileTimeEntryListCaches(queryClient, scope, entry);
  } catch (error) {
    console.error("Could not reconcile time-entry caches after time-entry mutation", {
      entryId: entry.id,
      error,
    });
  }
}

export const useCurrentTimerQuery = (options: UseCurrentTimerQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ?? timerKeys.currentRaw(toValue(options.scope)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: ({ signal }) => options.client.getCurrentTimer({ signal }),
  });

export const useOwnTimeEntriesQuery = (options: UseOwnTimeEntriesQueryOptions) => {
  const scopeGeneration = ref(0);
  const scopeKey = computed(() =>
    JSON.stringify(timeEntriesKeys.all(toValue(options.scope))[1]),
  );
  const fulfilledScopeKey = ref<string | null>(null);

  watch(
    () => scopeKey.value,
    () => {
      scopeGeneration.value += 1;
    },
    { flush: "sync" },
  );
  const queryKey = computed(() =>
    [
      ...(toValue(options.queryKey) ??
        timeEntriesKeys.list(toValue(options.scope), toValue(options.query))),
      "scope-generation",
      scopeGeneration.value,
    ] as const,
  );

  const query = useQuery({
    queryKey,
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: async ({ signal }) => {
      const requestScope = toValue(options.scope);
      const requestQuery = toValue(options.query);
      const requestGeneration = scopeGeneration.value;
      const result = await options.client.listOwnEntries(requestQuery, { signal });

      if (
        requestGeneration !== scopeGeneration.value ||
        !isSameScope(requestScope, toValue(options.scope))
      ) {
        throw new DOMException("The request scope changed", "AbortError");
      }

      fulfilledScopeKey.value = JSON.stringify(timeEntriesKeys.all(requestScope)[1]);
      return result;
    },
    refetchOnWindowFocus: true,
    ...USER_LIST_QUERY_POLICY,
    placeholderData: (previousData, previousQuery) => {
      const matches = previousQuery && belongsToScope(previousQuery.queryKey, toValue(options.scope));
      return matches ? previousData : undefined;
    },
  });

  watch(
    () => query.data.value,
    (data) => {
      if (data && fulfilledScopeKey.value === null) {
        fulfilledScopeKey.value = scopeKey.value;
      }
    },
    { immediate: true },
  );

  return {
    ...query,
    isDataForCurrentScope: computed(() => fulfilledScopeKey.value === scopeKey.value),
  };
};

export const useRecentOwnTimeEntriesQuery = (
  options: Omit<UseOwnTimeEntriesQueryOptions, "query">,
) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ??
      timeEntriesKeys.list(toValue(options.scope), recentOwnTimeEntriesQuery),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: ({ signal }) =>
      options.client.listOwnEntries(recentOwnTimeEntriesQuery, { signal }),
    ...USER_LIST_QUERY_POLICY,
  });

export const useVisibleProjectsQuery = (options: UseVisibleProjectsQueryOptions) =>
  useQuery({
    queryKey: computed(() =>
      toValue(options.queryKey) ?? userProjectsKeys.visibleProjects(toValue(options.scope)),
    ),
    enabled: computed(() => isQueryEnabled(options)),
    queryFn: () => options.client.listVisibleProjects(),
    refetchOnWindowFocus: true,
  });

export const useCreateManualTimeEntryMutation = (
  options: UseCreateManualTimeEntryMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualTimeEntryInput) =>
      options.client.createManualEntry(input),
    onMutate: (): TimeEntryMutationContext => ({
      hasUnknownSource: false,
      previousEntry: null,
      scope: toValue(options.scope),
    }),
    onSuccess: async (entry, _input, context) => {
      await invalidateTimeEntryMutation(queryClient, context, entry);
    },
  });
};

export const useCreateTaskMutation = (options: UseCreateTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateTaskInput }) =>
      options.client.createTask(projectId, input),
    onMutate: (): UserMutationContext => ({ scope: toValue(options.scope) }),
    onSuccess: async (_task, variables, context) => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTaskMutation(context.scope, variables.projectId),
      );
    },
  });
};

export const useDeleteTaskMutation = (options: UseDeleteTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { projectId: string; taskId: string }) =>
      options.client.deleteTask(taskId),
    onMutate: (): UserMutationContext => ({ scope: toValue(options.scope) }),
    onSuccess: async (_result, variables, context) => {
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTaskMutation(context.scope, variables.projectId),
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
    onMutate: (entryId): TimeEntryMutationContext => {
      const scope = toValue(options.scope);

      const previousEntry = readCachedEntry(queryClient, scope, entryId);

      return { hasUnknownSource: previousEntry === null, previousEntry, scope };
    },
    onSuccess: async (_result, _entryId, context) => {
      await invalidateTimeEntryMutation(queryClient, context, null);
    },
  });
};

export const useStartTimerMutation = (options: UseStartTimerMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartTimerInput) =>
      options.client.startTimer(input),
    onMutate: (): TimeEntryMutationContext => ({
      hasUnknownSource: false,
      previousEntry: null,
      scope: toValue(options.scope),
    }),
    onSuccess: async (timer, _input, context) => {
      await reconcileTimeEntryCachesAfterTimeEntryMutation(
        queryClient,
        context.scope,
        timer,
      );
      await invalidateTimerMutation(queryClient, context, timer);
    },
  });
};

export const useStartTimerFromGitHubMutation = (
  options: UseStartTimerFromGitHubMutationOptions,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartTimerFromGitHubInput) =>
      options.client.startTimerFromGitHub(input),
    onMutate: (): TimeEntryMutationContext => ({
      hasUnknownSource: false,
      previousEntry: null,
      scope: toValue(options.scope),
    }),
    onSuccess: async (timer, _input, context) => {
      await reconcileTimeEntryCachesAfterTimeEntryMutation(
        queryClient,
        context.scope,
        timer,
      );
      await invalidateTimerMutation(queryClient, context, timer);
    },
  });
};

export const useStopTimerMutation = (options: UseStopTimerMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConditionalStopTimerInput) => options.client.stopTimer(input),
    onMutate: (input): TimeEntryMutationContext => {
      const scope = toValue(options.scope);

      const previousEntry = readCachedEntry(queryClient, scope, input.expectedTimerId);

      return {
        hasUnknownSource: previousEntry === null,
        previousEntry,
        scope,
      };
    },
    onSuccess: async (timer, _input, context) => {
      await reconcileTimeEntryCachesAfterTimeEntryMutation(
        queryClient,
        context.scope,
        timer,
      );
      await invalidateTimerMutation(queryClient, context, timer);
    },
  });
};

export const useUpdateTaskMutation = (options: UseUpdateTaskMutationOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { projectId: string; taskId: string; input: UpdateTaskInput }) =>
      options.client.updateTask(taskId, input),
    onMutate: (): UserMutationContext => ({ scope: toValue(options.scope) }),
    onSuccess: async (task, variables, context) => {
      reconcileTimerTaskCachesAfterTaskMutation(queryClient, context.scope, task);
      await invalidateQueryKeys(
        queryClient,
        userMutationInvalidationKeys.afterTaskMutation(
          context.scope,
          variables.projectId,
          false,
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
    onMutate: (variables): TimeEntryMutationContext => {
      const scope = toValue(options.scope);

      const previousEntry = readCachedEntry(queryClient, scope, variables.entryId);

      return {
        hasUnknownSource: previousEntry === null,
        previousEntry,
        scope,
      };
    },
    onSuccess: async (timer, _input, context) => {
      await reconcileTimeEntryCachesAfterTimeEntryMutation(
        queryClient,
        context.scope,
        timer,
      );
      await invalidateTimeEntryMutation(queryClient, context, timer);
    },
  });
};
