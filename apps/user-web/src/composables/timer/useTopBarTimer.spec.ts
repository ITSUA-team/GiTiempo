// @vitest-environment jsdom

import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { ApiError } from "@gitiempo/web-shared/http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { useTopBarTimer } from "./useTopBarTimer";
import { timeEntriesKeys } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

const TEST_IDS = {
  hiddenProject: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9102",
  hiddenTask: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9202",
  project: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9101",
  runningEntry: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  task: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9201",
  taskAlt: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9204",
  taskNew: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9203",
  user: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301",
  workspace: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9401",
} as const;

const TEST_SCOPE = {
  userId: null,
  workspaceId: null,
};

function createProject(id: string, name: string, isActive = true): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive,
    members: [],
    name,
    source: "manual",
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: TEST_IDS.workspace,
  };
}

function createTask(id: string, projectId: string, title: string, isActive = true): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isActive,
    projectId,
    status: "open",
    title,
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: TEST_IDS.workspace,
  };
}

function createRunningEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const {
    githubIssue = null,
    project = { id: TEST_IDS.project, name: "Project Orion" },
    projectId = project.id,
    task = { id: TEST_IDS.task, title: "Improve reports filters" },
    taskId = task.id,
    ...entryOverrides
  } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    id: TEST_IDS.runningEntry,
    isBillable: true,
    project,
    projectId,
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task,
    taskId,
    updatedAt: "2026-04-21T09:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: TEST_IDS.user,
    },
    userId: TEST_IDS.user,
    workspaceId: TEST_IDS.workspace,
    githubIssue,
    ...entryOverrides,
  };
}

function createCompletedEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  return createRunningEntry({
    durationSeconds: 3600,
    endedAt: "2026-04-21T10:00:00.000Z",
    source: "manual",
    updatedAt: "2026-04-21T10:00:00.000Z",
    ...overrides,
  });
}

function createOwnEntriesResponse(
  items: TimeEntryResponse[],
  meta: TimeEntryListResponse["meta"] = { limit: 10, page: 1, total: items.length, totalPages: 1 },
): TimeEntryListResponse {
  return { items, meta };
}

function createClientMock(): TimeEntriesClient & {
  createManualEntry: ReturnType<typeof vi.fn<TimeEntriesClient["createManualEntry"]>>;
  createTask: ReturnType<typeof vi.fn<TimeEntriesClient["createTask"]>>;
  deleteEntry: ReturnType<typeof vi.fn<TimeEntriesClient["deleteEntry"]>>;
  deleteTask: ReturnType<typeof vi.fn<TimeEntriesClient["deleteTask"]>>;
  getCurrentTimer: ReturnType<typeof vi.fn<TimeEntriesClient["getCurrentTimer"]>>;
  listOwnEntries: ReturnType<typeof vi.fn<TimeEntriesClient["listOwnEntries"]>>;
  listProjectTasks: ReturnType<typeof vi.fn<TimeEntriesClient["listProjectTasks"]>>;
  listVisibleProjects: ReturnType<typeof vi.fn<TimeEntriesClient["listVisibleProjects"]>>;
  startTimer: ReturnType<typeof vi.fn<TimeEntriesClient["startTimer"]>>;
  stopTimer: ReturnType<typeof vi.fn<TimeEntriesClient["stopTimer"]>>;
  updateEntry: ReturnType<typeof vi.fn<TimeEntriesClient["updateEntry"]>>;
  updateTask: ReturnType<typeof vi.fn<TimeEntriesClient["updateTask"]>>;
} {
  return {
    createManualEntry: vi.fn(async () => createCompletedEntry()),
    createTask: vi.fn(async (projectId, input) =>
      createTask(TEST_IDS.taskNew, projectId, input.title),
    ),
    deleteEntry: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
    getCurrentTimer: vi.fn(async () => ({ timeEntry: null })),
    listOwnEntries: vi.fn(async () => createOwnEntriesResponse([])),
    listProjectTasks: vi.fn(async () => []),
    listVisibleProjects: vi.fn(async () => []),
    startTimer: vi.fn(async () => createRunningEntry()),
    stopTimer: vi.fn(async () => createCompletedEntry()),
    updateEntry: vi.fn(async () => createRunningEntry()),
    updateTask: vi.fn(async () => createTask(TEST_IDS.task, TEST_IDS.project, "Updated task")),
  };
}

function mountTopBarTimer(options?: {
  client?: ReturnType<typeof createClientMock>;
  toast?: { add: ReturnType<typeof vi.fn> };
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();

  authStore.accessToken = "access-token";
  const client = options?.client ?? createClientMock();
  const queryClient = createTestQueryClient();
  const toast = options?.toast ?? { add: vi.fn() };
  let topBarTimer!: ReturnType<typeof useTopBarTimer>;
  const Harness = defineComponent({
    setup() {
      topBarTimer = useTopBarTimer({
        client,
        toast: toast as never,
      });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: {
      plugins: [pinia, createTestQueryPlugin(queryClient)],
    },
  });

  return { client, queryClient, topBarTimer, toast, wrapper };
}

describe("useTopBarTimer", () => {
  const wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads the current running timer and exposes the stop state", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;
    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(topBarTimer.timerStatusLabel.value).toBe("Running timer");
    expect(topBarTimer.timerContextLabel.value).toBe(
      "Project Orion / Improve reports filters",
    );
    expect(topBarTimer.selectedContext.value?.taskId).toBe(TEST_IDS.task);
  });

  it("resolves the last eligible tracked task when idle", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Start");
    expect(topBarTimer.selectedContext.value).toEqual({
      projectId: TEST_IDS.project,
      projectName: "Project Orion",
      taskId: TEST_IDS.task,
      taskTitle: "Improve reports filters",
    });
    expect(topBarTimer.isPrimaryActionDisabled.value).toBe(false);
  });

  it("keeps the compact surface disabled when no eligible task exists", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([
        createCompletedEntry({
          project: { id: TEST_IDS.hiddenProject, name: "Hidden Project" },
          projectId: TEST_IDS.hiddenProject,
          task: { id: TEST_IDS.hiddenTask, title: "Hidden Task" },
          taskId: TEST_IDS.hiddenTask,
        }),
      ]),
    );

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();

    expect(topBarTimer.timerStatusLabel.value).toBe("No eligible task");
    expect(topBarTimer.selectedContext.value).toBeNull();
    expect(topBarTimer.isPrimaryActionDisabled.value).toBe(true);
  });

  it("loads picker options and confirms a selected task", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([createProject("project-1", "Project Orion")]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    topBarTimer.setSelectedProjectId("project-1");
    await flushPromises();
    topBarTimer.setSelectedTaskId("task-1");
    await topBarTimer.confirmSelectedTask();

    expect(topBarTimer.isDialogOpen.value).toBe(false);
    expect(topBarTimer.selectedContext.value).toEqual({
      projectId: "project-1",
      projectName: "Project Orion",
      taskId: "task-1",
      taskTitle: "Improve reports filters",
    });
    expect(topBarTimer.selectedDescription.value).toBe("");
  });

  it("keeps an idle description draft for the next start action", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([createProject("project-1", "Project Orion")]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    topBarTimer.setSelectedProjectId("project-1");
    await flushPromises();
    topBarTimer.setSelectedTaskId("task-1");
    topBarTimer.setSelectedDescription("Investigate release blocker");
    await topBarTimer.confirmSelectedTask();

    expect(topBarTimer.selectedDescription.value).toBe("Investigate release blocker");
  });

  it("preserves an explicit idle selection when the timer summary refetches", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Project Atlas"),
    ]);
    client.listOwnEntries.mockResolvedValue(
      createOwnEntriesResponse([
        createCompletedEntry({
          project: { id: "project-1", name: "Project Orion" },
          projectId: "project-1",
          task: { id: "task-1", title: "Improve reports filters" },
          taskId: "task-1",
        }),
      ]),
    );
    client.listProjectTasks.mockImplementation(async (projectId) => {
      if (projectId === "project-1") {
        return [createTask("task-1", "project-1", "Improve reports filters")];
      }

      return [createTask("task-2", "project-2", "Summarize PM scope changes")];
    });

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    topBarTimer.setSelectedProjectId("project-2");
    await flushPromises();
    topBarTimer.setSelectedTaskId("task-2");
    topBarTimer.setSelectedDescription("Investigate release blocker");
    await topBarTimer.confirmSelectedTask();
    await topBarTimer.refreshSummary();
    await flushPromises();

    expect(topBarTimer.selectedContext.value).toEqual({
      projectId: "project-2",
      projectName: "Project Atlas",
      taskId: "task-2",
      taskTitle: "Summarize PM scope changes",
    });
    expect(topBarTimer.selectedDescription.value).toBe("Investigate release blocker");
  });

  it("creates a task from the picker and selects it with success toast feedback", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValue([createProject("project-1", "Project Orion")]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    topBarTimer.setSelectedProjectId("project-1");
    await flushPromises();
    topBarTimer.setCreateTaskTitle("Write release checklist");
    await topBarTimer.createTaskFromDialog();
    await flushPromises();

    expect(client.createTask).toHaveBeenCalledWith("project-1", {
      title: "Write release checklist",
    });
    expect(topBarTimer.selectedTaskId.value).toBe(TEST_IDS.taskNew);
    expect(topBarTimer.createTaskTitle.value).toBe("");
    expect(topBarTimer.taskOptions.value).toContainEqual(
      expect.objectContaining({ id: TEST_IDS.taskNew, title: "Write release checklist" }),
    );
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Task created" }),
    );
  });

  it("keeps create-task errors scoped to the picker", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValue([createProject("project-1", "Project Orion")]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.createTask.mockRejectedValueOnce(new Error("task failed"));

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    topBarTimer.setSelectedProjectId("project-1");
    await flushPromises();
    topBarTimer.setCreateTaskTitle("Write release checklist");
    await topBarTimer.createTaskFromDialog();
    await flushPromises();

    expect(topBarTimer.createTaskErrorMessage.value).toBe("task failed");
    expect(topBarTimer.summaryErrorMessage.value).toBeNull();
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "error", summary: "Could not create the task" }),
    );
  });

  it("shows summary load failures through toast feedback and disables the action", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockRejectedValueOnce(new Error("network down"));

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();

    expect(topBarTimer.summaryErrorMessage.value).toBe("network down");
    expect(topBarTimer.isPrimaryActionDisabled.value).toBe(true);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Refresh and try again.",
        severity: "error",
        summary: "Could not load the timer summary",
      }),
    );
  });

  it("starts the selected task with success toast feedback", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(client.startTimer).toHaveBeenCalledWith({ taskId: TEST_IDS.task });
    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Timer started" }),
    );
  });

  it("starts the selected task with the current description draft", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([createProject("project-1", "Project Orion")]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.startTimer.mockResolvedValueOnce(
      createRunningEntry({ description: "Investigate release blocker" }),
    );

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    topBarTimer.setSelectedProjectId("project-1");
    await flushPromises();
    topBarTimer.setSelectedTaskId("task-1");
    topBarTimer.setSelectedDescription("Investigate release blocker");
    await topBarTimer.confirmSelectedTask();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(client.startTimer).toHaveBeenCalledWith({
      description: "Investigate release blocker",
      taskId: "task-1",
    });
    expect(topBarTimer.selectedDescription.value).toBe("Investigate release blocker");
  });

  it("refreshes authoritative timer state after a start conflict", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValue([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
    ]);
    client.startTimer.mockRejectedValueOnce(
      new ApiError("A timer is already running", { status: 409 }),
    );
    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: null }).mockResolvedValueOnce({
      timeEntry: createRunningEntry(),
    });

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(topBarTimer.selectedContext.value?.taskId).toBe(TEST_IDS.task);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please try again.",
        severity: "error",
        summary: "Could not start the timer",
      }),
    );
  });

  it("stops the timer with success toast feedback", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(client.stopTimer).toHaveBeenCalledWith();
    expect(topBarTimer.primaryActionLabel.value).toBe("Start");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Timer stopped" }),
    );
  });

  it("reconciles cached time-entry lists after successful timer start and stop", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { queryClient, topBarTimer } = mounted;
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 10, page: 1 });

    queryClient.setQueryData(listKey, createOwnEntriesResponse([]));

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(
      queryClient.getQueryData<TimeEntryListResponse>(listKey)?.items,
    ).toEqual([
      expect.objectContaining({
        endedAt: null,
        id: TEST_IDS.runningEntry,
      }),
    ]);

    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(
      queryClient.getQueryData<TimeEntryListResponse>(listKey)?.items,
    ).toEqual([
      expect.objectContaining({
        endedAt: "2026-04-21T10:00:00.000Z",
        id: TEST_IDS.runningEntry,
      }),
    ]);
  });

  it("keeps idle task selection independent from cached time-entry lists", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(createOwnEntriesResponse([]));
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
    ]);

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { queryClient, topBarTimer } = mounted;
    const listKey = timeEntriesKeys.list(TEST_SCOPE, { limit: 10, page: 1 });

    queryClient.setQueryData(listKey, createOwnEntriesResponse([]));

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();
    topBarTimer.setSelectedProjectId(TEST_IDS.project);
    await flushPromises();
    topBarTimer.setSelectedTaskId(TEST_IDS.task);
    await flushPromises();
    await topBarTimer.confirmSelectedTask();

    expect(topBarTimer.selectedContext.value).toEqual({
      projectId: TEST_IDS.project,
      projectName: "Project Orion",
      taskId: TEST_IDS.task,
      taskTitle: "Improve reports filters",
    });
    expect(
      queryClient.getQueryData<TimeEntryListResponse>(listKey)?.items,
    ).toEqual([]);
  });

  it("keeps the running timer rendered when stop fails", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.stopTimer.mockRejectedValueOnce(new Error("stop failed"));

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(topBarTimer.timerActionErrorMessage.value).toBe("stop failed");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please try again.",
        severity: "error",
        summary: "Could not stop the timer",
      }),
    );
  });

  it("advances the rendered elapsed timer display while a timer is running", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();

    expect(topBarTimer.elapsedTimeLabel.value).toBe("01:00:00");

    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(topBarTimer.elapsedTimeLabel.value).toBe("01:00:02");
  });

  it("preselects the running timer task when the dialog opens", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({
      timeEntry: createRunningEntry({
        task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
        taskId: TEST_IDS.taskAlt,
      }),
    });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client });

    await flushPromises();

    topBarTimer.selectedProjectId.value = "project-stale";
    topBarTimer.selectedTaskId.value = "task-stale";

    await topBarTimer.openDialog();
    await flushPromises();

    expect(topBarTimer.selectedProjectId.value).toBe(TEST_IDS.project);
    expect(topBarTimer.selectedTaskId.value).toBe(TEST_IDS.taskAlt);
    expect(topBarTimer.selectedDescription.value).toBe("");
  });

  it("updates the running timer task from the authoritative response", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() })
      .mockResolvedValue({
        timeEntry: createRunningEntry({
          task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
          taskId: TEST_IDS.taskAlt,
        }),
      });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);
    client.updateEntry.mockResolvedValueOnce(
      createRunningEntry({
        description: "Investigate release blocker",
        task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
        taskId: TEST_IDS.taskAlt,
      }),
    );

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedDescription("Investigate release blocker");
    topBarTimer.setSelectedTaskId(TEST_IDS.taskAlt);
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.updateEntry).toHaveBeenCalledWith(TEST_IDS.runningEntry, {
      description: "Investigate release blocker",
      taskId: TEST_IDS.taskAlt,
    });
    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.taskAlt);
    expect(topBarTimer.selectedDescription.value).toBe(
      "Investigate release blocker",
    );
    expect(topBarTimer.timerContextLabel.value).toBe(
      "Project Orion / Review PM scope rules",
    );
    expect(topBarTimer.isDialogOpen.value).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "success",
        summary: "Timer updated",
      }),
    );
  });

  it("clears a running timer description when the dialog submits whitespace only", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({
      timeEntry: createRunningEntry({ description: "Existing note" }),
    });
    client.listVisibleProjects.mockResolvedValue([createProject(TEST_IDS.project, "Project Orion")]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
    ]);
    client.updateEntry.mockResolvedValueOnce(
      createRunningEntry({ description: null }),
    );

    const mounted = mountTopBarTimer({ client });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    expect(topBarTimer.selectedDescription.value).toBe("Existing note");
    topBarTimer.setSelectedDescription("   ");
    await topBarTimer.confirmSelectedTask();

    expect(client.updateEntry).toHaveBeenCalledWith(TEST_IDS.runningEntry, {
      description: null,
      taskId: TEST_IDS.task,
    });
    expect(topBarTimer.selectedDescription.value).toBe("");
  });

  it("closes after a successful task correction when the refreshed timer is stopped", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() })
      .mockResolvedValueOnce({ timeEntry: null });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);
    client.updateEntry.mockResolvedValueOnce(
      createCompletedEntry({
        task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
        taskId: TEST_IDS.taskAlt,
      }),
    );

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId(TEST_IDS.taskAlt);
    const timerReadsBeforeConfirm = client.getCurrentTimer.mock.calls.length;
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.updateEntry).toHaveBeenCalledWith(TEST_IDS.runningEntry, {
      description: null,
      taskId: TEST_IDS.taskAlt,
    });
    expect(client.getCurrentTimer.mock.calls.length).toBeGreaterThan(
      timerReadsBeforeConfirm,
    );
    expect(topBarTimer.currentTimer.value?.endedAt).toBe("2026-04-21T10:00:00.000Z");
    expect(topBarTimer.isDialogOpen.value).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "success",
        summary: "Timer updated",
      }),
    );
  });

  it("ignores primary timer actions while a task update is pending", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };
    let resolveUpdate = (entry: TimeEntryResponse | PromiseLike<TimeEntryResponse>) => {
      void entry;
    };

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() })
      .mockResolvedValue({
        timeEntry: createRunningEntry({
          task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
          taskId: TEST_IDS.taskAlt,
        }),
      });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);
    client.updateEntry.mockReturnValueOnce(
      new Promise<TimeEntryResponse>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    const mounted = mountTopBarTimer({ client, toast });

    wrappers.push(mounted.wrapper);

    const { topBarTimer } = mounted;

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId(TEST_IDS.taskAlt);
    const confirmPromise = topBarTimer.confirmSelectedTask();

    await flushPromises();

    expect(topBarTimer.isPrimaryActionDisabled.value).toBe(true);

    topBarTimer.closeDialog();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(client.stopTimer).not.toHaveBeenCalled();
    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.task);

    resolveUpdate(
      createRunningEntry({
        task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
        taskId: TEST_IDS.taskAlt,
      }),
    );
    await confirmPromise;
    await flushPromises();

    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.taskAlt);
    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(topBarTimer.timerContextLabel.value).toBe(
      "Project Orion / Review PM scope rules",
    );
  });

  it("keeps the running timer aligned with the update response", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() })
      .mockResolvedValue({
        timeEntry: createRunningEntry({
          task: { id: TEST_IDS.taskNew, title: "Prepare quarterly summary" },
          taskId: TEST_IDS.taskNew,
        }),
      });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);
    client.updateEntry.mockResolvedValueOnce(
      createRunningEntry({
        task: { id: TEST_IDS.taskAlt, title: "Review PM scope rules" },
        taskId: TEST_IDS.taskAlt,
      }),
    );

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId(TEST_IDS.taskAlt);
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.taskAlt);
    expect(topBarTimer.timerContextLabel.value).toBe(
      "Project Orion / Review PM scope rules",
    );
  });

  it("closes the dialog without updating when confirming the current running task", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    expect(topBarTimer.selectedTaskId.value).toBe(TEST_IDS.task);

    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.updateEntry).not.toHaveBeenCalled();
    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.task);
    expect(topBarTimer.isDialogOpen.value).toBe(false);
  });

  it("keeps the dialog open when updating the running timer task fails", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);
    client.updateEntry.mockRejectedValueOnce(
      new ApiError("Task is inactive", { status: 422 }),
    );
    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId(TEST_IDS.taskAlt);
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.getCurrentTimer).toHaveBeenCalledTimes(2);
    expect(topBarTimer.isDialogOpen.value).toBe(true);
    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.task);
    expect(topBarTimer.selectionUpdateErrorMessage.value).toBe("Task is inactive");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not update the timer",
      }),
    );
  });

  it("refreshes authoritative timer state after a stale running timer update failure", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() })
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject(TEST_IDS.project, "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask(TEST_IDS.task, TEST_IDS.project, "Improve reports filters"),
      createTask(TEST_IDS.taskAlt, TEST_IDS.project, "Review PM scope rules"),
    ]);
    client.updateEntry.mockRejectedValueOnce(
      new ApiError("Time entry not found", { status: 404 }),
    );

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId(TEST_IDS.taskAlt);
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.getCurrentTimer).toHaveBeenCalledTimes(2);
    expect(topBarTimer.isDialogOpen.value).toBe(true);
    expect(topBarTimer.selectionUpdateErrorMessage.value).toBe("Time entry not found");
    expect(topBarTimer.currentTimer.value?.taskId).toBe(TEST_IDS.task);
  });
});
