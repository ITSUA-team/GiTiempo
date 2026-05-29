// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
  TimeEntryResponse,
} from "@gitiempo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { useTopBarTimer } from "./useTopBarTimer";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import { createTestQueryPlugin } from "@/test/query-client";

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
    workspaceId: "workspace-1",
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
    workspaceId: "workspace-1",
  };
}

function createRunningEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const {
    githubIssue = null,
    project = { id: "project-1", name: "Project Orion" },
    projectId = project.id,
    task = { id: "task-1", title: "Improve reports filters" },
    taskId = task.id,
    ...entryOverrides
  } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    id: "running-entry",
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
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
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
      createTask("task-new", projectId, input.title),
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
    updateTask: vi.fn(async () => createTask("task-1", "project-1", "Updated task")),
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

  mount(Harness, {
    global: {
      plugins: [pinia, createTestQueryPlugin()],
    },
  });

  return { client, topBarTimer, toast };
}

describe("useTopBarTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads the current running timer and exposes the stop state", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });

    const { topBarTimer } = mountTopBarTimer({ client });

    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(topBarTimer.timerStatusLabel.value).toBe("Running timer");
    expect(topBarTimer.timerContextLabel.value).toBe(
      "Project Orion / Improve reports filters",
    );
    expect(topBarTimer.selectedContext.value?.taskId).toBe("task-1");
  });

  it("resolves the last eligible tracked task when idle", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client });

    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Start");
    expect(topBarTimer.selectedContext.value).toEqual({
      projectId: "project-1",
      projectName: "Project Orion",
      taskId: "task-1",
      taskTitle: "Improve reports filters",
    });
    expect(topBarTimer.isPrimaryActionDisabled.value).toBe(false);
  });

  it("keeps the compact surface disabled when no eligible task exists", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([
        createCompletedEntry({
          project: { id: "project-hidden", name: "Hidden Project" },
          projectId: "project-hidden",
          task: { id: "task-hidden", title: "Hidden Task" },
          taskId: "task-hidden",
        }),
      ]),
    );

    const { topBarTimer } = mountTopBarTimer({ client });

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

    const { topBarTimer } = mountTopBarTimer({ client });

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
  });

  it("creates a task from the picker and selects it with success toast feedback", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValue([createProject("project-1", "Project Orion")]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client, toast });

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
    expect(topBarTimer.selectedTaskId.value).toBe("task-new");
    expect(topBarTimer.createTaskTitle.value).toBe("");
    expect(topBarTimer.taskOptions.value).toContainEqual(
      expect.objectContaining({ id: "task-new", title: "Write release checklist" }),
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

    const { topBarTimer } = mountTopBarTimer({ client, toast });

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

    const { topBarTimer } = mountTopBarTimer({ client, toast });

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
      createProject("project-1", "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(client.startTimer).toHaveBeenCalledWith("task-1");
    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Timer started" }),
    );
  });

  it("refreshes authoritative timer state after a start conflict", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listOwnEntries.mockResolvedValueOnce(
      createOwnEntriesResponse([createCompletedEntry()]),
    );
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.startTimer.mockRejectedValueOnce(new Error("A timer is already running"));
    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: null }).mockResolvedValueOnce({
      timeEntry: createRunningEntry(),
    });

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(topBarTimer.primaryActionLabel.value).toBe("Stop");
    expect(topBarTimer.selectedContext.value?.taskId).toBe("task-1");
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

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.handlePrimaryAction();
    await flushPromises();

    expect(client.stopTimer).toHaveBeenCalledWith();
    expect(topBarTimer.primaryActionLabel.value).toBe("Start");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Timer stopped" }),
    );
  });

  it("keeps the running timer rendered when stop fails", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.stopTimer.mockRejectedValueOnce(new Error("stop failed"));

    const { topBarTimer } = mountTopBarTimer({ client, toast });

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

    const { topBarTimer } = mountTopBarTimer({ client });

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
        task: { id: "task-2", title: "Review PM scope rules" },
        taskId: "task-2",
      }),
    });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Review PM scope rules"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client });

    await flushPromises();

    topBarTimer.selectedProjectId.value = "project-stale";
    topBarTimer.selectedTaskId.value = "task-stale";

    await topBarTimer.openDialog();
    await flushPromises();

    expect(topBarTimer.selectedProjectId.value).toBe("project-1");
    expect(topBarTimer.selectedTaskId.value).toBe("task-2");
  });

  it("updates the running timer task from the authoritative response", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Review PM scope rules"),
    ]);
    client.updateEntry.mockResolvedValueOnce(
      createRunningEntry({
        task: { id: "task-2", title: "Review PM scope rules" },
        taskId: "task-2",
      }),
    );

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId("task-2");
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.updateEntry).toHaveBeenCalledWith("running-entry", {
      taskId: "task-2",
    });
    expect(topBarTimer.currentTimer.value?.taskId).toBe("task-2");
    expect(topBarTimer.timerContextLabel.value).toBe(
      "Project Orion / Review PM scope rules",
    );
    expect(topBarTimer.isDialogOpen.value).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "success",
        summary: "Timer task updated",
      }),
    );
  });

  it("closes the dialog without updating when confirming the current running task", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Review PM scope rules"),
    ]);

    const { topBarTimer } = mountTopBarTimer({ client });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    expect(topBarTimer.selectedTaskId.value).toBe("task-1");

    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.updateEntry).not.toHaveBeenCalled();
    expect(topBarTimer.currentTimer.value?.taskId).toBe("task-1");
    expect(topBarTimer.isDialogOpen.value).toBe(false);
  });

  it("keeps the dialog open when updating the running timer task fails", async () => {
    const client = createClientMock();
    const toast = { add: vi.fn() };

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Review PM scope rules"),
    ]);
    client.updateEntry.mockRejectedValueOnce(new Error("Task is inactive"));

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId("task-2");
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(topBarTimer.isDialogOpen.value).toBe(true);
    expect(topBarTimer.currentTimer.value?.taskId).toBe("task-1");
    expect(topBarTimer.selectionUpdateErrorMessage.value).toBe("Task is inactive");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: "error",
        summary: "Could not update the timer task",
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
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Review PM scope rules"),
    ]);
    client.updateEntry.mockRejectedValueOnce(new Error("Time entry not found"));

    const { topBarTimer } = mountTopBarTimer({ client, toast });

    await flushPromises();
    await topBarTimer.openDialog();
    await flushPromises();

    topBarTimer.setSelectedTaskId("task-2");
    await topBarTimer.confirmSelectedTask();
    await flushPromises();

    expect(client.getCurrentTimer).toHaveBeenCalledTimes(2);
    expect(topBarTimer.isDialogOpen.value).toBe(true);
    expect(topBarTimer.selectionUpdateErrorMessage.value).toBe("Time entry not found");
    expect(topBarTimer.currentTimer.value?.taskId).toBe("task-1");
  });
});
