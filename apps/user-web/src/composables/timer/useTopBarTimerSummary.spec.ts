import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import type {
  CurrentTimeEntryResponse,
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { focusManager } from "@tanstack/vue-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h, nextTick, ref, type Ref } from "vue";

import {
  useCurrentTimerQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/composables/query";
import { useProjectsData } from "@/composables/projects/useProjectsData";
import { useTopBarTimerSummary } from "@/composables/timer/useTopBarTimerSummary";
import { userProjectsKeys, type UserServerStateScope } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

const IDS = {
  entry: "entry-1",
  project: "project-1",
  projectB: "project-2",
  task: "task-1",
  taskB: "task-2",
  user: "user-1",
  workspaceA: "workspace-a",
  workspaceB: "workspace-b",
} as const;

const scopeA = {
  userId: IDS.user,
  workspaceId: IDS.workspaceA,
};

const scopeB = {
  userId: IDS.user,
  workspaceId: IDS.workspaceB,
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function createProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    accessScope: "project",
    capabilities: { canManageTasks: true },
    color: null,
    createdAt: "2026-04-21T09:00:00.000Z",
    defaultBillableForTasks: true,
    description: null,
    id: IDS.project,
    isActive: true,
    members: [],
    name: "Project Orion",
    referenceProvenance: null,
    source: "manual",
    timeRoundingStepMinutes: null,
    totalSeconds: 0,
    trackingMode: "managed",
    updatedAt: "2026-04-21T09:00:00.000Z",
    visibility: "public",
    workspaceId: IDS.workspaceA,
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    accessScope: "project",
    capabilities: { canManageTasks: true },
    createdAt: "2026-04-21T09:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue: null,
    id: IDS.task,
    isActive: true,
    projectId: IDS.project,
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-21T09:00:00.000Z",
    workspaceId: IDS.workspaceA,
    ...overrides,
  };
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    githubIssue: null,
    id: IDS.entry,
    invoiceId: null,
    isBillable: true,
    project: { id: IDS.project, name: "Project Orion" },
    projectId: IDS.project,
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: IDS.task, title: "Improve reports filters" },
    taskId: IDS.task,
    updatedAt: "2026-04-21T09:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: IDS.user,
    },
    userId: IDS.user,
    workspace: { id: IDS.workspaceA, name: "Workspace A" },
    workspaceId: IDS.workspaceA,
    ...overrides,
  };
}

function createOwnEntriesResponse(items: TimeEntryResponse[]): TimeEntryListResponse {
  return {
    items,
    meta: { limit: 1, page: 1, total: items.length, totalPages: 1 },
  };
}

function createClientMock() {
  return {
    getCurrentTimer: vi.fn(async (): Promise<CurrentTimeEntryResponse> => ({
      timeEntry: null,
    })),
    listOwnEntries: vi.fn(async (): Promise<TimeEntryListResponse> =>
      createOwnEntriesResponse([])),
    listProjectTasks: vi.fn(async (_projectId: string): Promise<TaskResponse[]> => []),
    listVisibleProjects: vi.fn(async (): Promise<ProjectResponse[]> => []),
    startTimer: vi.fn(async () => createEntry()),
    stopTimer: vi.fn(async () =>
      createEntry({
        durationSeconds: 3600,
        endedAt: "2026-04-21T10:00:00.000Z",
      })),
  };
}

function mountSummary(options?: {
  client?: ReturnType<typeof createClientMock>;
  enabled?: Ref<boolean>;
  scope?: Ref<UserServerStateScope>;
  withActiveConsumers?: boolean;
  withStartMutation?: boolean;
}) {
  const client = options?.client ?? createClientMock();
  const enabled = options?.enabled ?? ref(true);
  const scope = options?.scope ?? ref<UserServerStateScope>(scopeA);
  const queryClient = createTestQueryClient();
  let summary!: ReturnType<typeof useTopBarTimerSummary>;
  let startTimerMutation: ReturnType<typeof useStartTimerMutation> | undefined;
  let stopTimerMutation: ReturnType<typeof useStopTimerMutation> | undefined;

  const Harness = defineComponent({
    setup() {
      summary = useTopBarTimerSummary({
        client: client as unknown as TimeEntriesClient,
        enabled: computed(() => enabled.value),
        scope: computed(() => scope.value),
        toast: { add: vi.fn() },
      });

      if (options?.withStartMutation) {
        startTimerMutation = useStartTimerMutation({
          client: { startTimer: client.startTimer },
          scope: computed(() => scope.value),
        });
        stopTimerMutation = useStopTimerMutation({
          client: { stopTimer: client.stopTimer },
          scope: computed(() => scope.value),
        });
      }

      if (options?.withActiveConsumers) {
        useCurrentTimerQuery({
          client,
          enabled: computed(() => enabled.value),
          scope: computed(() => scope.value),
        });
        useProjectsData({
          client: client as unknown as TimeEntriesClient,
          enabled: computed(() => enabled.value),
          onLoadProjectsError: () => undefined,
          onLoadTasksError: () => undefined,
          scope: computed(() => scope.value),
        });
      }

      return () => h("div");
    },
  });
  const wrapper = mount(Harness, {
    global: { plugins: [createTestQueryPlugin(queryClient)] },
  });

  return {
    client,
    enabled,
    queryClient,
    scope,
    startTimerMutation: () => startTimerMutation,
    stopTimerMutation: () => stopTimerMutation,
    summary,
    wrapper,
  };
}

describe("useTopBarTimerSummary", () => {
  const wrappers: VueWrapper[] = [];

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }

    vi.restoreAllMocks();
    focusManager.setFocused(undefined);
  });

  it("keeps a successful running revalidation when the earlier idle eligibility read failed", async () => {
    const client = createClientMock();
    const runningEntry = createEntry();

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: runningEntry });
    client.listOwnEntries.mockRejectedValueOnce(new Error("Eligibility failed"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const mounted = mountSummary({ client });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => {
      expect(mounted.summary.summaryErrorMessage.value).toBe("Eligibility failed");
    });

    await mounted.summary.refreshSummary();
    await flushPromises();

    expect(mounted.summary.currentTimer.value).toEqual(runningEntry);
    expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task);
    expect(mounted.summary.summaryErrorMessage.value).toBeNull();
  });

  it("restores the running timer after a current-timer error and an identical successful retry", async () => {
    const client = createClientMock();
    const runningEntry = createEntry();

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: runningEntry })
      .mockRejectedValueOnce(new Error("Current timer failed"))
      .mockResolvedValueOnce({ timeEntry: runningEntry });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const mounted = mountSummary({ client });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => expect(mounted.summary.currentTimer.value).toEqual(runningEntry));
    await mounted.summary.refreshSummary();
    await vi.waitFor(() => {
      expect(mounted.summary.currentTimer.value).toBeNull();
      expect(mounted.summary.summaryErrorMessage.value).toBe("Current timer failed");
    });

    await mounted.summary.refreshSummary();
    await flushPromises();

    expect(mounted.summary.currentTimer.value).toEqual(runningEntry);
    expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task);
  });

  it("restores the idle task after an eligibility error and an identical successful retry", async () => {
    const client = createClientMock();
    const completedEntry = createEntry({
      durationSeconds: 3600,
      endedAt: "2026-04-21T10:00:00.000Z",
    });

    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([completedEntry]))
      .mockRejectedValueOnce(new Error("Eligibility failed"))
      .mockResolvedValueOnce(createOwnEntriesResponse([completedEntry]));
    client.listVisibleProjects.mockResolvedValue([createProject()]);
    client.listProjectTasks.mockResolvedValue([createTask()]);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const mounted = mountSummary({ client });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => {
      expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task);
    });

    await mounted.summary.refreshSummary();
    await vi.waitFor(() => {
      expect(mounted.summary.selectedContext.value).toBeNull();
      expect(mounted.summary.summaryErrorMessage.value).toBe("Eligibility failed");
    });

    await mounted.summary.refreshSummary();
    await vi.waitFor(() => {
      expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task);
      expect(mounted.summary.summaryErrorMessage.value).toBeNull();
    });
  });

  it("clears old timer context while a disabled session still has a pending timer read", async () => {
    const client = createClientMock();
    const pendingTimer = createDeferred<CurrentTimeEntryResponse>();
    const enabled = ref(true);

    client.getCurrentTimer.mockReturnValueOnce(pendingTimer.promise);
    const mounted = mountSummary({ client, enabled });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => expect(client.getCurrentTimer).toHaveBeenCalledTimes(1));
    enabled.value = false;
    await nextTick();

    expect(mounted.summary.currentTimer.value).toBeNull();
    expect(mounted.summary.selectedContext.value).toBeNull();

    pendingTimer.resolve({ timeEntry: createEntry() });
    await flushPromises();

    expect(mounted.summary.currentTimer.value).toBeNull();
    expect(mounted.summary.selectedContext.value).toBeNull();
  });

  it("does not restore an old A timer after an A-to-B-to-A scope change", async () => {
    const client = createClientMock();
    const originalA = createDeferred<CurrentTimeEntryResponse>();
    const scope = ref<UserServerStateScope>(scopeA);

    client.getCurrentTimer
      .mockReturnValueOnce(originalA.promise)
      .mockReturnValueOnce(new Promise<CurrentTimeEntryResponse>(() => undefined));
    const mounted = mountSummary({ client, scope });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => expect(client.getCurrentTimer).toHaveBeenCalledTimes(1));
    scope.value = scopeB;
    await vi.waitFor(() => expect(client.getCurrentTimer).toHaveBeenCalledTimes(2));
    await nextTick();
    expect(mounted.summary.currentTimer.value).toBeNull();
    expect(mounted.summary.selectedContext.value).toBeNull();

    scope.value = scopeA;
    await nextTick();
    expect(mounted.summary.currentTimer.value).toBeNull();
    expect(mounted.summary.selectedContext.value).toBeNull();

    originalA.resolve({ timeEntry: createEntry() });
    await flushPromises();

    expect(mounted.summary.currentTimer.value).toBeNull();
    expect(mounted.summary.selectedContext.value).toBeNull();
  });

  it("refetches the canonical current timer when the window regains focus", async () => {
    const client = createClientMock();
    const runningEntry = createEntry();

    client.getCurrentTimer.mockResolvedValue({ timeEntry: runningEntry });
    const mounted = mountSummary({ client });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => expect(client.getCurrentTimer).toHaveBeenCalledTimes(1));
    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await vi.waitFor(() => expect(client.getCurrentTimer).toHaveBeenCalledTimes(2));
    expect(mounted.summary.currentTimer.value).toEqual(runningEntry);
  });

  it("does not restart the cached idle eligibility chain after a running-to-idle refresh", async () => {
    const client = createClientMock();
    const idleEntries = createDeferred<TimeEntryListResponse>();
    const completedEntry = createEntry({
      durationSeconds: 3600,
      endedAt: "2026-04-21T10:00:00.000Z",
    });

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: createEntry() })
      .mockResolvedValueOnce({ timeEntry: null });
    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([completedEntry]))
      .mockReturnValueOnce(idleEntries.promise);
    client.listVisibleProjects.mockResolvedValue([createProject()]);
    client.listProjectTasks.mockResolvedValue([createTask()]);

    const mounted = mountSummary({ client });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task));
    await mounted.summary.refreshSummary();
    await vi.waitFor(() => expect(mounted.summary.currentTimer.value).not.toBeNull());

    const refresh = mounted.summary.refreshSummary();
    await vi.waitFor(() => expect(client.listOwnEntries).toHaveBeenCalledTimes(2));
    idleEntries.resolve(createOwnEntriesResponse([completedEntry]));
    await refresh;
    await flushPromises();

    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);
    expect(client.listVisibleProjects).toHaveBeenCalledTimes(2);
    expect(client.listProjectTasks).toHaveBeenCalledTimes(2);
  });

  it("shares active current and project consumers across timer start and stop refreshes", async () => {
    const client = createClientMock();
    const projectA = createProject();
    const projectB = createProject({ id: IDS.projectB, name: "Project Vega" });
    const taskA = createTask();
    const taskB = createTask({
      id: IDS.taskB,
      projectId: IDS.projectB,
      title: "Unrelated task",
    });
    const completedEntry = createEntry({
      durationSeconds: 3600,
      endedAt: "2026-04-21T10:00:00.000Z",
    });
    const recentAfterStop = createDeferred<TimeEntryListResponse>();

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: createEntry() })
      .mockResolvedValueOnce({ timeEntry: null });
    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([completedEntry]))
      .mockReturnValueOnce(recentAfterStop.promise);
    client.listVisibleProjects.mockResolvedValue([projectA, projectB]);
    client.listProjectTasks.mockImplementation(async (projectId: string) =>
      projectId === IDS.project ? [taskA] : [taskB],
    );

    const mounted = mountSummary({
      client,
      withActiveConsumers: true,
      withStartMutation: true,
    });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => {
      expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task);
      expect(client.listProjectTasks.mock.calls.map(([projectId]) => projectId)).toContain(IDS.projectB);
    });
    vi.clearAllMocks();

    const startTimerMutation = mounted.startTimerMutation();
    expect(startTimerMutation).toBeDefined();
    await startTimerMutation!.mutateAsync({ taskId: IDS.task });
    await vi.waitFor(() => expect(client.getCurrentTimer).toHaveBeenCalledTimes(1));

    expect(client.listOwnEntries).not.toHaveBeenCalled();
    expect(mounted.summary.currentTimer.value?.id).toBe(IDS.entry);

    vi.clearAllMocks();
    const stopTimerMutation = mounted.stopTimerMutation();
    expect(stopTimerMutation).toBeDefined();
    const stop = stopTimerMutation!.mutateAsync({ expectedTimerId: IDS.entry });

    await vi.waitFor(() => {
      expect(client.getCurrentTimer).toHaveBeenCalledTimes(1);
      expect(client.listOwnEntries).toHaveBeenCalledTimes(1);
      expect(client.listVisibleProjects).toHaveBeenCalledTimes(1);
      expect(client.listProjectTasks).toHaveBeenCalledWith(IDS.project);
    });
    expect(client.listProjectTasks).not.toHaveBeenCalledWith(IDS.projectB);
    expect(client.listProjectTasks).toHaveBeenCalledTimes(1);

    recentAfterStop.resolve(createOwnEntriesResponse([completedEntry]));
    await stop;
    await flushPromises();

    expect(client.listVisibleProjects).toHaveBeenCalledTimes(1);
    expect(client.listProjectTasks).toHaveBeenCalledTimes(1);
    expect(mounted.summary.selectedContext.value?.taskId).toBe(IDS.task);
  });

  it("revalidates visibility after an external stop instead of reusing start-era access cache", async () => {
    const client = createClientMock();
    const runningEntry = createEntry();
    const completedEntry = createEntry({
      durationSeconds: 3600,
      endedAt: "2026-04-21T10:00:00.000Z",
    });

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: runningEntry })
      .mockResolvedValueOnce({ timeEntry: null });
    client.listOwnEntries
      .mockResolvedValueOnce(createOwnEntriesResponse([]))
      .mockResolvedValueOnce(createOwnEntriesResponse([completedEntry]));
    client.listVisibleProjects
      .mockResolvedValueOnce([createProject()])
      .mockResolvedValueOnce([]);
    client.listProjectTasks
      .mockResolvedValueOnce([createTask()])
      .mockResolvedValueOnce([]);

    const mounted = mountSummary({ client, withStartMutation: true });
    wrappers.push(mounted.wrapper);

    await vi.waitFor(() => expect(client.listOwnEntries).toHaveBeenCalledTimes(1));
    const startTimerMutation = mounted.startTimerMutation();
    expect(startTimerMutation).toBeDefined();
    await startTimerMutation!.mutateAsync({ taskId: IDS.task });
    await vi.waitFor(() => expect(mounted.summary.currentTimer.value).toEqual(runningEntry));

    await mounted.queryClient.fetchQuery({
      queryKey: userProjectsKeys.visibleProjects(scopeA),
      queryFn: () => client.listVisibleProjects(),
    });
    await mounted.queryClient.fetchQuery({
      queryKey: userProjectsKeys.projectTasks(scopeA, IDS.project, "project"),
      queryFn: () => client.listProjectTasks(IDS.project),
    });
    await mounted.summary.refreshSummary();
    await flushPromises();

    expect(client.listVisibleProjects).toHaveBeenCalledTimes(2);
    expect(client.listProjectTasks).toHaveBeenCalledTimes(1);
    expect(mounted.summary.currentTimer.value).toBeNull();
    expect(mounted.summary.selectedContext.value).toBeNull();
  });
});
