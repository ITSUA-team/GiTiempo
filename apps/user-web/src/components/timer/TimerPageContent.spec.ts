// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { ProjectResponse, TaskResponse, TimeEntryResponse } from "@gitiempo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { useTimerPage } from "@/composables/useTimerPage";
import type { TimerPageClient } from "@/services/timer-page-client";
import { useAuthStore } from "@/stores/auth";

function createProject(id: string, name: string): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive: true,
    members: [],
    name,
    source: "manual",
    totalHours: 12,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  };
}

function createTask(id: string, projectId: string, title: string): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isActive: true,
    projectId,
    status: "open",
    title,
    updatedAt: "2026-04-20T12:00:00.000Z",
    workspaceId: "workspace-1",
  };
}

function createRunningEntry(): TimeEntryResponse {
  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    id: "running-entry",
    isBillable: true,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: "task-1", title: "Improve reports filters" },
    taskId: "task-1",
    updatedAt: "2026-04-21T09:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
  };
}

function createCompletedEntry(): TimeEntryResponse {
  return {
    ...createRunningEntry(),
    durationSeconds: 3600,
    endedAt: "2026-04-21T10:00:00.000Z",
    source: "manual",
    updatedAt: "2026-04-21T10:00:00.000Z",
  };
}

function createClientMock(): TimerPageClient & {
  createManualEntry: ReturnType<typeof vi.fn<TimerPageClient["createManualEntry"]>>;
  getCurrentTimer: ReturnType<typeof vi.fn<TimerPageClient["getCurrentTimer"]>>;
  listProjectTasks: ReturnType<typeof vi.fn<TimerPageClient["listProjectTasks"]>>;
  listVisibleProjects: ReturnType<
    typeof vi.fn<TimerPageClient["listVisibleProjects"]>
  >;
  startTimer: ReturnType<typeof vi.fn<TimerPageClient["startTimer"]>>;
  stopTimer: ReturnType<typeof vi.fn<TimerPageClient["stopTimer"]>>;
} {
  return {
    createManualEntry: vi.fn<TimerPageClient["createManualEntry"]>(
      async () => createCompletedEntry(),
    ),
    getCurrentTimer: vi.fn<TimerPageClient["getCurrentTimer"]>(async () => ({
      timeEntry: null,
    })),
    listProjectTasks: vi.fn<TimerPageClient["listProjectTasks"]>(async () => []),
    listVisibleProjects: vi.fn<TimerPageClient["listVisibleProjects"]>(
      async () => [],
    ),
    startTimer: vi.fn<TimerPageClient["startTimer"]>(
      async () => createRunningEntry(),
    ),
    stopTimer: vi.fn<TimerPageClient["stopTimer"]>(
      async () => createCompletedEntry(),
    ),
  };
}

function mountTimerPage(options?: {
  client?: ReturnType<typeof createClientMock>;
  toast?: { add: ReturnType<typeof vi.fn> };
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();

  authStore.accessToken = "access-token";
  const client = options?.client ?? createClientMock();
  const toast = options?.toast ?? { add: vi.fn() };
  let timerPage!: ReturnType<typeof useTimerPage>;
  const Harness = defineComponent({
    setup() {
      timerPage = useTimerPage({
        client,
        toast: toast as never,
      });

      return () => h("div");
    },
  });

  mount(Harness, {
    global: {
      plugins: [pinia],
    },
  });

  return {
    client,
    timerPage,
    toast,
  };
}

describe("useTimerPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T10:00:00.000Z"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads visible projects and syncs selectors from the current active timer", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { timerPage } = mountTimerPage({ client });

    await flushPromises();

    expect(client.listVisibleProjects).toHaveBeenCalledTimes(1);
    expect(client.getCurrentTimer).toHaveBeenCalledTimes(1);
    expect(client.listProjectTasks).toHaveBeenCalledWith("access-token", "project-1");
    expect(timerPage.selectedProjectId.value).toBe("project-1");
    expect(timerPage.selectedTaskId.value).toBe("task-1");
    expect(timerPage.primaryActionLabel.value).toBe("Stop");
  });

  it("resets the selected task when the project changes while idle", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Project Atlas"),
    ]);
    client.listProjectTasks
      .mockResolvedValueOnce([createTask("task-1", "project-1", "Task One")])
      .mockResolvedValueOnce([createTask("task-2", "project-2", "Task Two")]);

    const { timerPage } = mountTimerPage({ client });

    await flushPromises();

    timerPage.setSelectedProjectId("project-1");
    await flushPromises();
    timerPage.setSelectedTaskId("task-1");
    timerPage.setSelectedProjectId("project-2");
    await flushPromises();

    expect(timerPage.selectedTaskId.value).toBeNull();
    expect(client.listProjectTasks).toHaveBeenLastCalledWith(
      "access-token",
      "project-2",
    );
  });

  it("starts and stops the timer with success toasts and refreshed state", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValue([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() })
      .mockResolvedValueOnce({ timeEntry: null });

    const toast = { add: vi.fn() };
    const { timerPage } = mountTimerPage({ client, toast });

    await flushPromises();

    timerPage.setSelectedProjectId("project-1");
    await flushPromises();
    timerPage.setSelectedTaskId("task-1");
    await timerPage.handlePrimaryAction();
    await flushPromises();

    expect(client.startTimer).toHaveBeenCalledWith("access-token", "task-1");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Timer started" }),
    );
    expect(timerPage.primaryActionLabel.value).toBe("Stop");

    await timerPage.handlePrimaryAction();
    await flushPromises();

    expect(client.stopTimer).toHaveBeenCalledWith("access-token");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "success", summary: "Timer stopped" }),
    );
    expect(timerPage.primaryActionLabel.value).toBe("Start");
  });

  it("refreshes authoritative timer state after a start-timer conflict", async () => {
    const client = createClientMock();

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.startTimer.mockRejectedValueOnce(new Error("A timer is already running"));

    const toast = { add: vi.fn() };
    const { timerPage } = mountTimerPage({ client, toast });

    await flushPromises();

    timerPage.selectedProjectId.value = "project-1";
    timerPage.selectedTaskId.value = "task-1";
    await timerPage.handlePrimaryAction();
    await flushPromises();

    expect(timerPage.selectedProjectId.value).toBe("project-1");
    expect(timerPage.selectedTaskId.value).toBe("task-1");
    expect(timerPage.primaryActionLabel.value).toBe("Stop");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please try again.",
        severity: "error",
        summary: "Could not start the timer",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not start the timer", {
      context: { action: "start-timer", feature: "timer-page" },
      error: expect.any(Error),
    });
  });

  it("keeps manual inputs intact and refreshes timer state after a conflict", async () => {
    const manualTaskId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001";
    const client = createClientMock();

    client.getCurrentTimer
      .mockResolvedValueOnce({ timeEntry: null })
      .mockResolvedValueOnce({ timeEntry: createRunningEntry() });
    client.createManualEntry.mockRejectedValueOnce(
      new Error("Manual entry overlaps the current active timer"),
    );

    const toast = { add: vi.fn() };
    const { timerPage } = mountTimerPage({ client, toast });

    await flushPromises();

    timerPage.selectedTaskId.value = manualTaskId;
    timerPage.manualDate.value = new Date("2026-04-21T00:00:00.000Z");
    timerPage.manualStartTime.value = new Date("2026-04-21T09:00:00.000Z");
    timerPage.manualEndTime.value = new Date("2026-04-21T10:30:00.000Z");
    await timerPage.submitManualEntry();
    await flushPromises();

    expect(timerPage.manualEntryErrorMessage.value).toBe(
      "Manual entry overlaps the current active timer",
    );
    expect(timerPage.timerActionErrorMessage.value).toBeNull();
    expect(timerPage.manualDate.value).not.toBeNull();
    expect(timerPage.manualStartTime.value).not.toBeNull();
    expect(timerPage.manualEndTime.value).not.toBeNull();
    expect(timerPage.primaryActionLabel.value).toBe("Stop");
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Please review the entry and try again.",
        severity: "error",
        summary: "Could not add the manual entry",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not add the manual entry", {
      context: { action: "create-manual-entry", feature: "timer-page" },
      error: expect.any(Error),
    });
  });

  it("validates manual interval ranges before submitting", async () => {
    const manualTaskId = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001";
    const { client, timerPage } = mountTimerPage();

    await flushPromises();

    timerPage.selectedTaskId.value = manualTaskId;
    timerPage.manualDate.value = new Date("2026-04-21T00:00:00.000Z");
    timerPage.manualStartTime.value = new Date("2026-04-21T10:30:00.000Z");
    timerPage.manualEndTime.value = new Date("2026-04-21T09:00:00.000Z");
    await timerPage.submitManualEntry();
    await flushPromises();

    expect(timerPage.manualEntryErrorMessage.value).toBe(
      "endedAt must be later than startedAt",
    );
    expect(client.createManualEntry).not.toHaveBeenCalled();
  });

  it("advances the rendered elapsed timer display while a timer is running", async () => {
    const client = createClientMock();

    client.getCurrentTimer.mockResolvedValueOnce({ timeEntry: createRunningEntry() });

    const { timerPage } = mountTimerPage({ client });

    await flushPromises();

    expect(timerPage.elapsedTimeLabel.value).toBe("01:00:00");

    vi.advanceTimersByTime(2000);
    await flushPromises();

    expect(timerPage.elapsedTimeLabel.value).toBe("01:00:02");
  });
});
