// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { describe, expect, it, vi } from "vitest";
import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import type { ConfirmLike } from "@gitiempo/web-shared";

import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";

import { useTimeEntriesPage } from "./useTimeEntriesPage";

function createProject(overrides: Partial<ProjectResponse> = {}): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
    isActive: true,
    members: [],
    name: "Project Orion",
    source: "manual",
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
    isActive: true,
    projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T10:30:00.000Z",
    description: null,
    durationSeconds: 5400,
    endedAt: "2026-04-21T10:30:00.000Z",
    id: "entry-1",
    isBillable: false,
    project: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
      name: "Project Orion",
    },
    projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
    source: "manual",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: {
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
      title: "Improve reports filters",
    },
    taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
    updatedAt: "2026-04-21T10:30:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
    githubIssue,
    ...entryOverrides,
  };
}

interface MountOptions {
  tasksByProject?: Record<string, TaskResponse[]>;
  entriesResponse?: TimeEntryListResponse;
  listOwnEntries?: ReturnType<typeof vi.fn>;
  listVisibleProjects?: ReturnType<typeof vi.fn>;
  listProjectTasks?: ReturnType<typeof vi.fn>;
  createManualEntry?: ReturnType<typeof vi.fn>;
  updateEntry?: ReturnType<typeof vi.fn>;
  deleteEntry?: ReturnType<typeof vi.fn>;
  nowMs?: number;
}

function createDeferred<T>() {
  // eslint-disable-next-line no-unused-vars
  let resolve!: (value: T) => void;
  // eslint-disable-next-line no-unused-vars
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}

async function mountTimeEntriesPage(options: MountOptions = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const authStore = useAuthStore();
  authStore.accessToken = "access-token";

  const defaultEntriesResponse: TimeEntryListResponse = options.entriesResponse ?? {
    items: [
      createEntry({
        id: "entry-running",
        durationSeconds: null,
        endedAt: null,
        source: "web",
        startedAt: "2026-04-21T09:00:00.000Z",
      }),
      createEntry({
        id: "entry-completed",
        startedAt: "2026-04-20T09:00:00.000Z",
        endedAt: "2026-04-20T10:30:00.000Z",
      }),
    ],
    meta: {
      limit: 20,
      page: 1,
      total: 2,
      totalPages: 1,
    },
  };
  const projects = [
    createProject(),
    createProject({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      name: "Admin Web",
    }),
  ];
  const tasksByProject: Record<string, TaskResponse[]> = {
    "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001": [createTask()],
    "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002": [
      createTask({
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
        title: "Ship admin polish",
      }),
    ],
    ...options.tasksByProject,
  };

  const client = {
    createManualEntry:
      options.createManualEntry ?? vi.fn(async () => createEntry({ id: "entry-created" })),
    createTask: vi.fn(),
    deleteEntry: options.deleteEntry ?? vi.fn(async () => undefined),
    getCurrentTimer: vi.fn(),
    listOwnEntries:
      options.listOwnEntries ??
      vi.fn(async (_accessToken: string, query?: { limit?: number; page?: number }) => ({
        ...defaultEntriesResponse,
        meta: {
          ...defaultEntriesResponse.meta,
          limit: query?.limit ?? defaultEntriesResponse.meta.limit,
          page: query?.page ?? defaultEntriesResponse.meta.page,
        },
      })),
    listProjectTasks:
      options.listProjectTasks ??
      vi.fn(async (_accessToken: string, projectId: string) => tasksByProject[projectId] ?? []),
    listVisibleProjects:
      options.listVisibleProjects ?? vi.fn(async () => projects),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    updateEntry:
      options.updateEntry ?? vi.fn(async () => createEntry({ id: "entry-updated" })),
  };

  const confirmState = {
    options: null as null | Parameters<ConfirmLike["require"]>[0],
  };
  const confirm = {
    require: vi.fn((nextOptions) => {
      confirmState.options = nextOptions;
    }),
  };
  const toastAdd = vi.fn();
  let currentNow = options.nowMs ?? Date.parse("2026-04-21T11:00:05.000Z");
  let intervalCallback: (() => void) | null = null;

  let api!: ReturnType<typeof useTimeEntriesPage>;

  const Harness = defineComponent({
    setup() {
      api = useTimeEntriesPage({
        authStore,
        clearIntervalFn: vi.fn(),
        client: client as never,
        confirm,
        now: () => currentNow,
        setIntervalFn: (((callback: () => void) => {
          intervalCallback = callback;
          return 1 as never;
        }) as unknown) as typeof setInterval,
        toast: { add: toastAdd },
      });

      return () => null;
    },
  });

  mount(Harness, {
    global: {
      plugins: [pinia],
    },
  });

  await flushPromises();

  return {
    advanceTime(ms: number) {
      currentNow += ms;
      intervalCallback?.();
    },
    api,
    authStore,
    client,
    confirmState,
    toastAdd,
  };
}

describe("useTimeEntriesPage", () => {
  it("loads initial data, keeps a loading state distinct, groups entries by day, and updates running durations", async () => {
    const pendingEntries = vi.fn(
      async () =>
        ({
          items: [createEntry({ endedAt: null, durationSeconds: null, source: "web" })],
          meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }) satisfies TimeEntryListResponse,
    );

    const { api, client, advanceTime } = await mountTimeEntriesPage({
      listOwnEntries: pendingEntries,
    });

    expect(client.listVisibleProjects).toHaveBeenCalledWith("access-token");
    expect(client.listOwnEntries).toHaveBeenCalledWith("access-token", {
      dateFrom: undefined,
      dateTo: undefined,
      limit: 20,
      page: 1,
      projectId: undefined,
      search: undefined,
      taskId: undefined,
    });
    expect(api.pageState.value).toBe("ready");
    expect(api.groupedEntries.value[0]?.heading).toBe("Today, Apr 21");
    expect(api.formatDuration(api.entries.value[0]!)).toBe("02:00:05");

    advanceTime(3000);

    expect(api.formatDuration(api.entries.value[0]!)).toBe("02:00:08");
  });

  it("keeps request-error and empty states distinct", async () => {
    const errorMount = await mountTimeEntriesPage({
      listOwnEntries: vi.fn(async () => {
        throw new Error("network down");
      }),
    });

    expect(errorMount.api.pageState.value).toBe("request-error");
    expect(errorMount.api.requestErrorMessage.value).toBe("network down");
    expect(errorMount.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not load time entries",
      }),
    );

    const emptyMount = await mountTimeEntriesPage({
      entriesResponse: {
        items: [],
        meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
      },
    });

    expect(emptyMount.api.pageState.value).toBe("empty");
    expect(emptyMount.api.requestErrorMessage.value).toBeNull();
  });

  it("applies filter and pagination changes through the shared list query", async () => {
    const { api, client } = await mountTimeEntriesPage();

    await api.setDateRange([
      new Date("2026-04-01T00:00:00.000Z"),
      new Date("2026-04-21T00:00:00.000Z"),
    ]);
    await api.setSelectedProjectId("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");
    api.handleFilterTaskSearch("ship");
    await api.setSelectedTaskFilter({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      isActive: true,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      title: "Ship admin polish",
    });
    await api.setPage(2);

    expect(client.listProjectTasks).toHaveBeenCalledWith(
      "access-token",
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
    );
    expect(client.listOwnEntries).toHaveBeenLastCalledWith("access-token", {
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T00:00:00.000Z",
      limit: 20,
      page: 2,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      search: "Ship admin polish",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
    });
  });

  it("ignores stale entry responses after filters change quickly", async () => {
    const firstResponse = createDeferred<TimeEntryListResponse>();
    const secondResponse = createDeferred<TimeEntryListResponse>();
    const listOwnEntries = vi
      .fn<TimeEntriesClient["listOwnEntries"]>()
      .mockImplementationOnce(async () => firstResponse.promise)
      .mockImplementationOnce(async () => secondResponse.promise);

    const { api } = await mountTimeEntriesPage({ listOwnEntries });

    expect(api.pageState.value).toBe("loading");

    const nextFilterLoad = api.setSelectedProjectId(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
    );

    secondResponse.resolve({
      items: [createEntry({ id: "fresh-entry", projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002" })],
      meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
    });
    await nextFilterLoad;
    await flushPromises();

    firstResponse.resolve({
      items: [createEntry({ id: "stale-entry" })],
      meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
    });
    await flushPromises();

    expect(api.entries.value.map((entry) => entry.id)).toEqual(["fresh-entry"]);
    expect(api.selectedProjectId.value).toBe("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");
    expect(api.pageState.value).toBe("ready");
  });

  it("maps create payloads, refreshes the list, and preserves pagination after success", async () => {
    const { api, client } = await mountTimeEntriesPage({
      entriesResponse: {
        items: [createEntry()],
        meta: { limit: 20, page: 1, total: 40, totalPages: 2 },
      },
    });

    await api.setPage(2);
    await api.openCreateDialog("2026-04-21");
    await api.setDialogProjectId("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");
    api.setDialogTaskValue({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      isActive: true,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      title: "Ship admin polish",
    });
    api.setDialogDescription("Manual cleanup");
    api.setDialogIsBillable(true);
    api.setDialogStartedAt(new Date("2026-04-21T09:15:00.000Z"));
    api.setDialogEndedAt(new Date("2026-04-21T10:45:00.000Z"));

    await api.saveDialog();

    expect(client.createManualEntry).toHaveBeenCalledWith("access-token", {
      description: "Manual cleanup",
      endedAt: "2026-04-21T10:45:00.000Z",
      isBillable: true,
      startedAt: "2026-04-21T09:15:00.000Z",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
    });
    expect(api.isDialogOpen.value).toBe(false);
    expect(client.listOwnEntries).toHaveBeenLastCalledWith("access-token", {
      dateFrom: undefined,
      dateTo: undefined,
      limit: 20,
      page: 2,
      projectId: undefined,
      search: undefined,
      taskId: undefined,
    });
    expect(api.dialogErrors.value.taskId).toBeNull();
  });

  it("surfaces description validation errors before submit", async () => {
    const { api, client } = await mountTimeEntriesPage();

    await api.openCreateDialog();
    await api.setDialogProjectId("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");
    api.setDialogTaskValue({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      isActive: true,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      title: "Ship admin polish",
    });
    api.setDialogStartedAt(new Date("2026-04-21T09:15:00.000Z"));
    api.setDialogEndedAt(new Date("2026-04-21T10:45:00.000Z"));
    api.setDialogDescription("x".repeat(2001));

    await api.saveDialog();

    expect(client.createManualEntry).not.toHaveBeenCalled();
    expect(api.dialogErrors.value.description).toBe(
      "Too big: expected string to have <=2000 characters",
    );
    expect(api.isDialogOpen.value).toBe(true);
  });

  it("prefills edit values, supports project and task reassignment, and keeps failures retryable", async () => {
    const updateEntry = vi.fn(async () => {
      throw new Error("Task is inactive");
    });
    const { api, client, toastAdd } = await mountTimeEntriesPage({ updateEntry });
    const entry = createEntry();

    await api.openEditDialog(entry);

    expect(api.dialogMode.value).toBe("edit");
    expect(api.dialogProjectId.value).toBe("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001");
    expect(api.dialogTaskValue.value).toEqual({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
      isActive: true,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
      title: "Improve reports filters",
    });

    await api.setDialogProjectId("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");
    api.setDialogTaskValue({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      isActive: true,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      title: "Ship admin polish",
    });
    api.setDialogDescription("Updated after reassignment");
    api.setDialogEndedAt(new Date("2026-04-21T11:00:00.000Z"));

    await api.saveDialog();

    expect(client.updateEntry).toHaveBeenCalledWith(
      "access-token",
      entry.id,
      expect.objectContaining({
        description: "Updated after reassignment",
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      }),
    );
    expect(api.isDialogOpen.value).toBe(true);
    expect(api.dialogRequestErrorMessage.value).toBe("Task is inactive");
    expect(api.dialogDescription.value).toBe("Updated after reassignment");
    expect(api.dialogTaskValue.value).toEqual({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
      isActive: true,
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
      title: "Ship admin polish",
    });
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not update time entry",
      }),
    );
  });

  it("shows all selected-project tasks in edit mode when the dialog task query is empty", async () => {
    const { api } = await mountTimeEntriesPage({
      tasksByProject: {
        "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001": [
          createTask({
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
            projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
            title: "Improve reports filters",
          }),
          createTask({
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2003",
            projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
            title: "Review release notes",
          }),
        ],
      },
    });

    await api.openEditDialog(createEntry());
    const initialSuggestions = api.dialogTaskSuggestions.value;

    api.handleDialogTaskSearch("");

    expect(api.dialogTaskSuggestions.value).toEqual([
      {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
        isActive: true,
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
        title: "Improve reports filters",
      },
      {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2003",
        isActive: true,
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
        title: "Review release notes",
      },
    ]);
    expect(api.dialogTaskSuggestions.value).not.toBe(initialSuggestions);
  });

  it("ignores stale task responses when the selected dialog project changes quickly", async () => {
    const firstTasks = createDeferred<TaskResponse[]>();
    const secondTasks = createDeferred<TaskResponse[]>();
    const listProjectTasks = vi
      .fn<TimeEntriesClient["listProjectTasks"]>()
      .mockImplementationOnce(async () => firstTasks.promise)
      .mockImplementationOnce(async () => secondTasks.promise);

    const { api } = await mountTimeEntriesPage({ listProjectTasks });

    await api.openCreateDialog();
    const firstLoad = api.setDialogProjectId("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001");
    const secondLoad = api.setDialogProjectId("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");

    secondTasks.resolve([
      createTask({
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
        title: "Ship admin polish",
      }),
    ]);
    await secondLoad;

    firstTasks.resolve([
      createTask({
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
        title: "Improve reports filters",
      }),
    ]);
    await firstLoad;
    await flushPromises();

    expect(api.dialogProjectId.value).toBe("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002");
    expect(api.dialogTaskSuggestions.value).toEqual([
      {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2002",
        isActive: true,
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
        title: "Ship admin polish",
      },
    ]);
  });

  it("confirms deletes, refreshes on success, and keeps failures visible on error", async () => {
    const deleteEntry = vi
      .fn(async () => undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Delete failed"));
    const { api, client, confirmState, toastAdd } = await mountTimeEntriesPage({ deleteEntry });
    const entry = createEntry({ id: "entry-delete" });

    api.requestDeleteEntry(entry);
    await confirmState.options?.accept();

    expect(client.deleteEntry).toHaveBeenCalledWith("access-token", "entry-delete");
    expect(client.listOwnEntries).toHaveBeenCalledTimes(2);

    api.requestDeleteEntry(entry);
    await confirmState.options?.accept();

    expect(api.lastMutationErrorMessage.value).toBe("Delete failed");
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not delete time entry",
      }),
    );
  });
});
