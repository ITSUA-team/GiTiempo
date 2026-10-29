import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type {
  CurrentTimeEntryResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { useQuery } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h, ref } from "vue";

import {
  useCurrentTimerQuery,
  useOwnTimeEntriesQuery,
  useRecentOwnTimeEntriesQuery,
  useStartTimerMutation,
  useStopTimerMutation,
  useUpdateTaskMutation,
  useUpdateTimeEntryMutation,
} from "@/composables/query";
import { useTopBarTimerSummary } from "@/composables/timer/useTopBarTimerSummary";
import {
  timeEntriesKeys,
  timerKeys,
  userProjectsKeys,
  type UserServerStateScope,
} from "@/lib/query-keys";
import * as timeEntryQueryCache from "@/lib/time-entry-query-cache";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

const TEST_IDS = {
  project: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9101",
  runningEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  task: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9201",
  user: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301",
  workspace: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9401",
  workspaceOther: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9402",
} as const;

const TEST_SCOPE = {
  userId: null,
  workspaceId: null,
};

const ACTIVE_WORKSPACE_SCOPE = {
  userId: TEST_IDS.user,
  workspaceId: TEST_IDS.workspace,
};

type ListOwnEntriesOptions = Parameters<TimeEntriesClient["listOwnEntries"]>[1];
type CurrentTimerOptions = Parameters<TimeEntriesClient["getCurrentTimer"]>[0];

function createDeferred<T>() {
  const deferred = {} as {
    promise: Promise<T>;
    reject: (error?: unknown) => void;
    resolve: (value: T) => void;
  };

  deferred.promise = new Promise<T>((nextResolve, nextReject) => {
    deferred.resolve = nextResolve;
    deferred.reject = nextReject;
  });

  return deferred;
}

function createAbortableDeferred<T>() {
  const deferred = createDeferred<T>();

  return {
    reject: deferred.reject,
    resolve: deferred.resolve,
    wait(signal?: AbortSignal): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));

        if (signal?.aborted) {
          onAbort();
          return;
        }

        signal?.addEventListener("abort", onAbort, { once: true });
        deferred.promise.then(
          (value: T) => {
            signal?.removeEventListener("abort", onAbort);
            resolve(value);
          },
          (error: unknown) => {
            signal?.removeEventListener("abort", onAbort);
            reject(error);
          },
        );
      });
    },
  };
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 3600,
    endedAt: "2026-04-21T10:00:00.000Z",
    id: TEST_IDS.runningEntry,
    isBillable: false,
    project: {
      id: TEST_IDS.project,
      name: "Project Orion",
    },
    projectId: TEST_IDS.project,
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: {
      id: TEST_IDS.task,
      title: "Improve reports filters",
    },
    taskId: TEST_IDS.task,
    updatedAt: "2026-04-21T10:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: TEST_IDS.user,
    },
    userId: TEST_IDS.user,
    workspace: {
      id: TEST_IDS.workspace,
      name: "Workspace Alpha",
    },
    workspaceId: TEST_IDS.workspace,
    githubIssue,
    invoiceId: null,
    ...entryOverrides,
  };
}

function createOwnEntriesResponse(
  items: TimeEntryResponse[],
  meta: TimeEntryListResponse["meta"] = { limit: 10, page: 1, total: items.length, totalPages: 1 },
): TimeEntryListResponse {
  return { items, meta };
}

function createTask(
  projectId: string,
  title: string,
): TaskResponse {
  return {
    accessScope: "project",
    capabilities: { canManageTasks: true },
    createdAt: "2026-04-21T09:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue: null,
    id: `${projectId}-task`,
    isActive: true,
    projectId,
    status: "open",
    title,
    updatedAt: "2026-04-21T10:00:00.000Z",
    workspaceId: TEST_IDS.workspace,
  };
}

function createClientMock(): Pick<
  TimeEntriesClient,
  "getCurrentTimer" | "listOwnEntries" | "startTimer" | "stopTimer" | "updateEntry"
> & {
  getCurrentTimer: ReturnType<typeof vi.fn<TimeEntriesClient["getCurrentTimer"]>>;
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listOwnEntries"]>>;
  startTimer: ReturnType<typeof vi.fn<TimeEntriesClient["startTimer"]>>;
  stopTimer: ReturnType<typeof vi.fn<TimeEntriesClient["stopTimer"]>>;
  updateEntry: ReturnType<typeof vi.fn<TimeEntriesClient["updateEntry"]>>;
} {
  return {
    getCurrentTimer: vi.fn(async () => ({ timeEntry: null })),
    listOwnEntries: vi.fn(async () => createOwnEntriesResponse([])),
    startTimer: vi.fn(async () =>
      createEntry({
        durationSeconds: null,
        endedAt: null,
        updatedAt: "2026-04-21T10:00:00.000Z",
      })),
    stopTimer: vi.fn(async () =>
      createEntry({
        durationSeconds: 1800,
        endedAt: "2026-04-21T09:30:00.000Z",
        updatedAt: "2026-04-21T09:30:00.000Z",
      })),
    updateEntry: vi.fn(async () => createEntry()),
  };
}

function mountQueryHarness(options?: {
  client?: ReturnType<typeof createClientMock>;
  initialRecentEntries?: TimeEntryListResponse;
  scope?: typeof TEST_SCOPE | typeof ACTIVE_WORKSPACE_SCOPE;
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();

  authStore.accessToken = "access-token";

  const client = options?.client ?? createClientMock();
  const queryClient = createTestQueryClient();
  const scopeRef = ref<UserServerStateScope>(options?.scope ?? TEST_SCOPE);
  const listKey = timeEntriesKeys.list(scopeRef.value, { limit: 10, page: 1 });

  if (options?.initialRecentEntries) {
    queryClient.setQueryData(listKey, options.initialRecentEntries, { updatedAt: 1 });
  }

  let recentEntriesQuery!: ReturnType<typeof useRecentOwnTimeEntriesQuery>;
  let currentTimerQuery!: ReturnType<typeof useCurrentTimerQuery>;
  let startTimerMutation!: ReturnType<typeof useStartTimerMutation>;
  let stopTimerMutation!: ReturnType<typeof useStopTimerMutation>;
  let updateTimeEntryMutation!: ReturnType<typeof useUpdateTimeEntryMutation>;

  const Harness = defineComponent({
    setup() {
      const accessToken = computed(() => authStore.accessToken);
      const scope = computed(() => scopeRef.value);

      currentTimerQuery = useCurrentTimerQuery({
        client,
        enabled: computed(() => Boolean(accessToken.value)),
        scope,
      });
      recentEntriesQuery = useRecentOwnTimeEntriesQuery({
        client,
        enabled: computed(() => Boolean(accessToken.value)),
        queryKey: computed(() => listKey),
        scope,
      });
      startTimerMutation = useStartTimerMutation({
        client,
        scope,
      });
      stopTimerMutation = useStopTimerMutation({
        client,
        scope,
      });
      updateTimeEntryMutation = useUpdateTimeEntryMutation({ client, scope });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: {
      plugins: [pinia, createTestQueryPlugin(queryClient)],
    },
  });

  return {
    client,
    currentTimerQuery,
    listKey,
    queryClient,
    recentEntriesQuery,
    startTimerMutation,
    stopTimerMutation,
    updateTimeEntryMutation,
    scopeRef,
    wrapper,
  };
}

describe("query timer reconciliation", () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }

    vi.restoreAllMocks();
  });

  it("passes the current timer query abort signal to its client", async () => {
    const request = createAbortableDeferred<CurrentTimeEntryResponse>();
    const client = createClientMock();
    client.getCurrentTimer.mockImplementation((options?: CurrentTimerOptions) =>
      request.wait(options?.signal),
    );
    const mounted = mountQueryHarness({ client });
    wrappers.push(mounted.wrapper);

    await flushPromises();

    const signal = client.getCurrentTimer.mock.calls[0]?.[0]?.signal;

    expect(signal).toBeInstanceOf(AbortSignal);

    mounted.wrapper.unmount();

    expect(signal?.aborted).toBe(true);
  });

  it("keeps a started timer entry authoritative when a stale recent-list request resolves late", async () => {
    const client = createClientMock();
    const staleListRequest = createAbortableDeferred<TimeEntryListResponse>();
    const startedEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      updatedAt: "2026-04-21T10:00:00.000Z",
    });

    client.listOwnEntries
      .mockImplementationOnce((_query, options?: ListOwnEntriesOptions) =>
        staleListRequest.wait(options?.signal),
      )
      .mockResolvedValue(createOwnEntriesResponse([startedEntry]));
    client.startTimer.mockResolvedValueOnce(startedEntry);

    const mounted = mountQueryHarness({
      client,
      initialRecentEntries: createOwnEntriesResponse([]),
    });

    wrappers.push(mounted.wrapper);

    await flushPromises();
    await mounted.startTimerMutation.mutateAsync({ taskId: TEST_IDS.task });
    await flushPromises();

    const firstSignal = client.listOwnEntries.mock.calls[0]?.[1]?.signal;

    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal?.aborted).toBe(true);
    expect(mounted.recentEntriesQuery.data.value?.items).toEqual([
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    ]);

    staleListRequest.resolve(createOwnEntriesResponse([]));
    await flushPromises();

    expect(mounted.queryClient.getQueryData<TimeEntryListResponse>(mounted.listKey)?.items).toEqual([
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    ]);
  });

  it("keeps a stopped timer entry authoritative when a stale running-list request resolves late", async () => {
    const client = createClientMock();
    const staleListRequest = createAbortableDeferred<TimeEntryListResponse>();
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      updatedAt: "2026-04-21T10:00:00.000Z",
    });
    const stoppedEntry = createEntry({
      durationSeconds: 1800,
      endedAt: "2026-04-21T09:30:00.000Z",
      updatedAt: "2026-04-21T09:30:00.000Z",
    });

    client.listOwnEntries
      .mockImplementationOnce((_query, options?: ListOwnEntriesOptions) =>
        staleListRequest.wait(options?.signal),
      )
      .mockResolvedValue(createOwnEntriesResponse([stoppedEntry]));
    client.stopTimer.mockResolvedValueOnce(stoppedEntry);

    const mounted = mountQueryHarness({
      client,
      initialRecentEntries: createOwnEntriesResponse([runningEntry]),
    });

    wrappers.push(mounted.wrapper);

    await flushPromises();
    await mounted.stopTimerMutation.mutateAsync({ expectedTimerId: runningEntry.id });
    await flushPromises();

    const firstSignal = client.listOwnEntries.mock.calls[0]?.[1]?.signal;

    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal?.aborted).toBe(true);
    expect(mounted.recentEntriesQuery.data.value?.items).toEqual([
      expect.objectContaining({
        endedAt: "2026-04-21T09:30:00.000Z",
        id: TEST_IDS.runningEntry,
      }),
    ]);

    staleListRequest.resolve(createOwnEntriesResponse([runningEntry]));
    await flushPromises();

    expect(mounted.queryClient.getQueryData<TimeEntryListResponse>(mounted.listKey)?.items).toEqual([
      expect.objectContaining({
        endedAt: "2026-04-21T09:30:00.000Z",
        id: TEST_IDS.runningEntry,
      }),
    ]);
  });

  it("does not reconcile a stopped timer from another workspace into the active workspace cache", async () => {
    const client = createClientMock();
    const stoppedOtherWorkspaceEntry = createEntry({
      durationSeconds: 1800,
      endedAt: "2026-04-21T09:30:00.000Z",
      updatedAt: "2026-04-21T09:30:00.000Z",
      workspace: {
        id: TEST_IDS.workspaceOther,
        name: "Workspace Beta",
      },
      workspaceId: TEST_IDS.workspaceOther,
    });
    const reconcileSpy = vi.spyOn(
      timeEntryQueryCache,
      "reconcileTimeEntryListCaches",
    );

    client.stopTimer.mockResolvedValueOnce(stoppedOtherWorkspaceEntry);

    const mounted = mountQueryHarness({
      client,
      initialRecentEntries: createOwnEntriesResponse([]),
      scope: ACTIVE_WORKSPACE_SCOPE,
    });

    wrappers.push(mounted.wrapper);

    await flushPromises();
    await mounted.stopTimerMutation.mutateAsync({
      expectedTimerId: stoppedOtherWorkspaceEntry.id,
    });
    await flushPromises();

    expect(reconcileSpy).not.toHaveBeenCalled();
    expect(
      mounted.queryClient.getQueryData<TimeEntryListResponse>(mounted.listKey)?.items,
    ).toEqual([]);
  });

  it("does not reject a successful timer mutation when cache reconciliation throws", async () => {
    const client = createClientMock();
    const reconcileError = new Error("reconcile failed");

    vi.spyOn(timeEntryQueryCache, "reconcileTimeEntryListCaches").mockImplementation(() => {
      throw reconcileError;
    });

    const mounted = mountQueryHarness({ client });

    wrappers.push(mounted.wrapper);

    await expect(
      mounted.startTimerMutation.mutateAsync({ taskId: TEST_IDS.task }),
    ).resolves.toEqual(
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        entryId: TEST_IDS.runningEntry,
        error: reconcileError,
      }),
    );
  });

  it("keeps a mutation's invalidation in the scope where it started", async () => {
    const client = createClientMock();
    const startedEntry = createEntry({ durationSeconds: null, endedAt: null });
    const startRequest = createDeferred<TimeEntryResponse>();
    client.startTimer.mockReturnValueOnce(startRequest.promise);
    const mounted = mountQueryHarness({ client, scope: ACTIVE_WORKSPACE_SCOPE });
    wrappers.push(mounted.wrapper);
    const invalidate = vi.spyOn(mounted.queryClient, "invalidateQueries");

    await flushPromises();
    const pendingStart = mounted.startTimerMutation.mutateAsync({ taskId: TEST_IDS.task });
    await flushPromises();
    mounted.scopeRef.value = {
      userId: TEST_IDS.user,
      workspaceId: TEST_IDS.workspaceOther,
    };
    startRequest.resolve(startedEntry);
    await pendingStart;

    const invalidatedKeys = invalidate.mock.calls.map(
      ([filters]) => (filters as { queryKey?: readonly unknown[] }).queryKey,
    );

    expect(invalidatedKeys).toContainEqual(timeEntriesKeys.all(ACTIVE_WORKSPACE_SCOPE));
    expect(invalidatedKeys).not.toContainEqual(
      timeEntriesKeys.all({
        userId: TEST_IDS.user,
        workspaceId: TEST_IDS.workspaceOther,
      }),
    );
  });

  it("keeps the broad fallback for an uncached update despite its returned destination", async () => {
    const mounted = mountQueryHarness();
    wrappers.push(mounted.wrapper);
    const invalidate = vi.spyOn(mounted.queryClient, "invalidateQueries");

    await mounted.updateTimeEntryMutation.mutateAsync({
      entryId: "uncached-entry",
      input: {} as never,
    });

    expect(invalidate.mock.calls.map(([filters]) =>
      (filters as { queryKey?: readonly unknown[] }).queryKey,
    )).toContainEqual(userProjectsKeys.all(TEST_SCOPE));
  });

  async function assertTaskEditReconcilesTimerCaches(
    running: boolean,
  ): Promise<void> {
    const queryClient = createTestQueryClient();
    const projectA = TEST_IDS.project;
    const projectB = "project-b";
    const initialTaskA = {
      ...createTask(projectA, "Before edit"),
      id: TEST_IDS.task,
    };
    const updatedTaskA = {
      ...initialTaskA,
      title: "After edit",
    };
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      task: { id: TEST_IDS.task, title: initialTaskA.title },
      taskId: TEST_IDS.task,
    });
    const client = {
      getCurrentTimer: vi.fn(async () => ({
        timeEntry: running ? runningEntry : null,
      })),
      listOwnEntries: vi.fn(async () =>
        createOwnEntriesResponse([createEntry({ taskId: TEST_IDS.task })]),
      ),
      listProjectTasks: vi.fn(async () => [initialTaskA]),
      listVisibleProjects: vi.fn(async () => [
        {
          accessScope: "project" as const,
          capabilities: { canManageTasks: true },
          defaultBillableForTasks: true,
          id: projectA,
          isActive: true,
          name: "Project A",
          trackingMode: "managed" as const,
        },
      ]),
      updateTask: vi.fn(async () => updatedTaskA),
    };
    const taskReads: Record<string, () => Promise<TaskResponse[]>> = {
      [projectA]: vi.fn(async () => [initialTaskA]),
      [projectB]: vi.fn(async () => [createTask(projectB, "Unrelated task")]),
    };
    const optionReads: Record<string, () => Promise<TaskResponse[]>> = {
      [projectA]: vi.fn(async () => [initialTaskA]),
      [projectB]: vi.fn(async () => [createTask(projectB, "Unrelated option")]),
    };
    let summary!: ReturnType<typeof useTopBarTimerSummary>;
    let updateTaskMutation!: ReturnType<typeof useUpdateTaskMutation>;

    // eslint-disable-next-line vue/one-component-per-file
    const Harness = defineComponent({
      setup() {
        const scope = computed(() => ACTIVE_WORKSPACE_SCOPE);
        const enabled = computed(() => true);

        useCurrentTimerQuery({ client, enabled, scope });
        summary = useTopBarTimerSummary({
          client: client as unknown as TimeEntriesClient,
          enabled,
          scope,
          toast: { add: vi.fn() },
        });
        for (const projectId of [projectA, projectB]) {
          useQuery({
            queryKey: userProjectsKeys.projectTasks(scope.value, projectId, "project"),
            queryFn: () => taskReads[projectId]!(),
          });
          useQuery({
            queryKey: timerKeys.projectTaskOptions(scope.value, projectId, "project"),
            queryFn: () => optionReads[projectId]!(),
          });
        }
        updateTaskMutation = useUpdateTaskMutation({
          client: { updateTask: client.updateTask },
          scope,
        });

        return () => h("div");
      },
    });
    const wrapper = mount(Harness, {
      global: { plugins: [createTestQueryPlugin(queryClient)] },
    });
    wrappers.push(wrapper);

    await vi.waitFor(() => {
      expect(taskReads[projectA]).toHaveBeenCalledTimes(1);
      expect(taskReads[projectB]).toHaveBeenCalledTimes(1);
      expect(optionReads[projectA]).toHaveBeenCalledTimes(1);
      expect(optionReads[projectB]).toHaveBeenCalledTimes(1);
      expect(summary.currentTimer.value).toEqual(running ? runningEntry : null);
      expect(summary.selectedContext.value?.taskTitle).toBe(initialTaskA.title);
    });

    vi.clearAllMocks();

    await updateTaskMutation.mutateAsync({
      input: { title: updatedTaskA.title },
      projectId: projectA,
      taskId: updatedTaskA.id,
    });

    await vi.waitFor(() => {
      expect(taskReads[projectA]).toHaveBeenCalledTimes(1);
      expect(optionReads[projectA]).toHaveBeenCalledTimes(1);
      expect(summary.selectedContext.value?.taskTitle).toBe(updatedTaskA.title);
    });
    expect(taskReads[projectB]).not.toHaveBeenCalled();
    expect(optionReads[projectB]).not.toHaveBeenCalled();
    expect(client.getCurrentTimer).not.toHaveBeenCalled();
    expect(client.listOwnEntries).not.toHaveBeenCalled();
    expect(client.listVisibleProjects).not.toHaveBeenCalled();
    expect(client.listProjectTasks).not.toHaveBeenCalled();
    expect(summary.currentTimer.value?.task.title ?? null).toBe(
      running ? updatedTaskA.title : null,
    );
  }

  it("updates the idle top-bar task context without its current-timer cascade", async () => {
    await assertTaskEditReconcilesTimerCaches(false);
  });

  it("updates the running top-bar timer label without its current-timer cascade", async () => {
    await assertTaskEditReconcilesTimerCaches(true);
  });

  it("targets a stopped timer response when the entry was not cached", async () => {
    const queryClient = createTestQueryClient();
    const projectA = TEST_IDS.project;
    const projectB = "project-b";
    const taskReads: Record<string, () => Promise<TaskResponse[]>> = {
      [projectA]: vi.fn(async () => [createTask(projectA, "Project A task")]),
      [projectB]: vi.fn(async () => [createTask(projectB, "Project B task")]),
    };
    const stopTimer = vi.fn(async () => createEntry({
      durationSeconds: 1800,
      endedAt: "2026-04-21T09:30:00.000Z",
      projectId: projectA,
      taskId: TEST_IDS.task,
    }));
    let stopTimerMutation!: ReturnType<typeof useStopTimerMutation>;

    // eslint-disable-next-line vue/one-component-per-file
    const Harness = defineComponent({
      setup() {
        const scope = computed(() => ACTIVE_WORKSPACE_SCOPE);

        for (const projectId of [projectA, projectB]) {
          useQuery({
            queryKey: userProjectsKeys.projectTasks(scope.value, projectId, "project"),
            queryFn: () => taskReads[projectId]!(),
          });
        }
        stopTimerMutation = useStopTimerMutation({ client: { stopTimer }, scope });

        return () => h("div");
      },
    });
    const wrapper = mount(Harness, {
      global: { plugins: [createTestQueryPlugin(queryClient)] },
    });
    wrappers.push(wrapper);

    await vi.waitFor(() => {
      expect(taskReads[projectA]).toHaveBeenCalledTimes(1);
      expect(taskReads[projectB]).toHaveBeenCalledTimes(1);
    });
    vi.clearAllMocks();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await stopTimerMutation.mutateAsync({ expectedTimerId: TEST_IDS.runningEntry });

    await vi.waitFor(() => expect(taskReads[projectA]).toHaveBeenCalledTimes(1));
    expect(taskReads[projectB]).not.toHaveBeenCalled();
    expect(invalidate.mock.calls.map(([filters]) =>
      (filters as { queryKey?: readonly unknown[] }).queryKey,
    )).not.toContainEqual(userProjectsKeys.all(ACTIVE_WORKSPACE_SCOPE));
  });

  it("rejects an old A generation after an A-to-B-to-A scope change", async () => {
    const originalA = createDeferred<TimeEntryListResponse>();
    const client = createClientMock();
    const scopeRef = ref<UserServerStateScope>(ACTIVE_WORKSPACE_SCOPE);
    let ownEntriesQuery!: ReturnType<typeof useOwnTimeEntriesQuery>;

    client.listOwnEntries
      .mockReturnValueOnce(originalA.promise)
      .mockReturnValueOnce(new Promise<TimeEntryListResponse>(() => undefined))
      .mockReturnValueOnce(new Promise<TimeEntryListResponse>(() => undefined));

    // eslint-disable-next-line vue/one-component-per-file
    const Harness = defineComponent({
      setup() {
        ownEntriesQuery = useOwnTimeEntriesQuery({
          client,
          enabled: computed(() => true),
          query: computed(() => ({ limit: 10, page: 1 })),
          scope: computed(() => scopeRef.value),
        });

        return () => h("div");
      },
    });
    const wrapper = mount(Harness, {
      global: { plugins: [createTestQueryPlugin()] },
    });
    wrappers.push(wrapper);

    await vi.waitFor(() => expect(client.listOwnEntries).toHaveBeenCalledTimes(1));
    scopeRef.value = {
      userId: TEST_IDS.user,
      workspaceId: TEST_IDS.workspaceOther,
    };
    await vi.waitFor(() => expect(client.listOwnEntries).toHaveBeenCalledTimes(2));
    scopeRef.value = ACTIVE_WORKSPACE_SCOPE;
    await vi.waitFor(() => expect(client.listOwnEntries).toHaveBeenCalledTimes(3));

    originalA.resolve(createOwnEntriesResponse([createEntry()]));
    await flushPromises();

    expect(ownEntriesQuery.data.value).toBeUndefined();
    expect(ownEntriesQuery.isDataForCurrentScope.value).toBe(false);
  });
});
