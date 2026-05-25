// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { useProjectsPage } from "./useProjectsPage";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import { createTestQueryPlugin } from "@/test/query-client";

function createProject(
  id: string,
  name: string,
  isActive = true,
): ProjectResponse {
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

function createTask(
  id: string,
  projectId: string,
  title: string,
  overrides: Partial<TaskResponse> = {},
): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isActive: true,
    projectId,
    status: "open",
    title,
    updatedAt: "2026-04-21T10:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
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
    createManualEntry: vi.fn(async () => {
      throw new Error("unused");
    }),
    createTask: vi.fn(async (_accessToken, projectId, input) =>
      createTask("task-new", projectId, input.title),
    ),
    deleteEntry: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
    getCurrentTimer: vi.fn(async () => ({ timeEntry: null })),
    listOwnEntries: vi.fn(async () => ({
      items: [],
      meta: { limit: 10, page: 1, total: 0, totalPages: 0 },
    })),
    listProjectTasks: vi.fn(async () => []),
    listVisibleProjects: vi.fn(async () => []),
    startTimer: vi.fn(async () => {
      throw new Error("unused");
    }),
    stopTimer: vi.fn(async () => {
      throw new Error("unused");
    }),
    updateEntry: vi.fn(async () => {
      throw new Error("unused");
    }),
    updateTask: vi.fn(async (_accessToken, taskId, input) =>
      createTask(taskId, "project-1", input.title ?? "Updated task", {
        status: input.status ?? "open",
      }),
    ),
  };
}

function mountProjectsPage(options?: {
  client?: ReturnType<typeof createClientMock>;
  confirm?: { require: ReturnType<typeof vi.fn> };
  toast?: { add: ReturnType<typeof vi.fn> };
}) {
  const pinia = createPinia();

  setActivePinia(pinia);

  const authStore = useAuthStore();

  authStore.accessToken = "access-token";

  const client = options?.client ?? createClientMock();
  const confirm = options?.confirm ?? { require: vi.fn() };
  const toast = options?.toast ?? { add: vi.fn() };
  let projectsPage!: ReturnType<typeof useProjectsPage>;
  const Harness = defineComponent({
    setup() {
      projectsPage = useProjectsPage({
        client,
        confirm: confirm as never,
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

  return {
    client,
    confirm,
    projectsPage,
    toast,
  };
}

describe("useProjectsPage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("loads visible active projects and active tasks on mount", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Archived Project", false),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
      createTask("task-2", "project-1", "Inactive task", { isActive: false }),
    ]);

    const { projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    expect(projectsPage.pageState.value).toBe("ready");
    expect(projectsPage.visibleProjects.value).toHaveLength(1);
    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toEqual([
      expect.objectContaining({ id: "task-1" }),
    ]);
  });

  it("retries failed task loads and clears the request error state", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue(createProjectList());
    client.listProjectTasks
      .mockRejectedValueOnce(new Error("tasks down"))
      .mockResolvedValueOnce([
        createTask("task-1", "project-1", "Improve reports filters"),
      ]);

    const { projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    expect(projectsPage.pageState.value).toBe("request-error");
    expect(projectsPage.taskLoadErrors.value["project-1"]).toBe("tasks down");

    await projectsPage.retryLoadPage();
    await flushPromises();

    expect(projectsPage.pageState.value).toBe("ready");
    expect(projectsPage.requestErrorMessage.value).toBeNull();
  });

  it("filters full project groups and matching task rows through the combined search", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Billing API"),
    ]);
    client.listProjectTasks
      .mockResolvedValueOnce([
        createTask("task-1", "project-1", "Improve reports filters"),
        createTask("task-2", "project-1", "Review PM scope rules"),
      ])
      .mockResolvedValueOnce([
        createTask("task-3", "project-2", "Finalize invoice webhook"),
      ]);

    const { projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    projectsPage.setSearchValue("orion");
    expect(projectsPage.filteredProjectGroups.value).toHaveLength(1);
    expect(projectsPage.filteredProjectGroups.value[0]?.project.name).toBe(
      "Project Orion",
    );
    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toEqual([
      expect.objectContaining({ id: "task-1" }),
      expect.objectContaining({ id: "task-2" }),
    ]);

    projectsPage.setSearchValue("billing");
    expect(projectsPage.filteredProjectGroups.value).toHaveLength(1);
    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toHaveLength(1);

    projectsPage.setSearchValue("invoice");
    expect(projectsPage.filteredProjectGroups.value).toHaveLength(1);
    expect(projectsPage.filteredProjectGroups.value[0]?.project.name).toBe(
      "Billing API",
    );
    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toEqual([
      expect.objectContaining({ id: "task-3" }),
    ]);

    projectsPage.setSearchValue("");
    expect(projectsPage.filteredProjectGroups.value).toHaveLength(2);
  });

  it("creates a task from a preselected project dialog and updates the local group", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce(createProjectList());
    client.listProjectTasks.mockResolvedValueOnce([]);

    const { projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    projectsPage.openCreateDialog("project-1");
    projectsPage.setDialogTaskTitle("Write release checklist");
    await projectsPage.saveDialog();

    expect(client.createTask).toHaveBeenCalledWith(
      "access-token",
      "project-1",
      { title: "Write release checklist" },
    );
    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toEqual([
      expect.objectContaining({ title: "Write release checklist" }),
    ]);
    expect(projectsPage.isDialogOpen.value).toBe(false);
  });

  it("keeps the create dialog open and shows validation errors for missing project and blank title", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce(createProjectList());
    client.listProjectTasks.mockResolvedValueOnce([]);

    const { projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    projectsPage.openCreateDialog();
    projectsPage.setDialogTaskTitle("   ");
    await projectsPage.saveDialog();

    expect(client.createTask).not.toHaveBeenCalled();
    expect(projectsPage.isDialogOpen.value).toBe(true);
    expect(projectsPage.dialogErrors.value.projectId).toBe("Select a project.");
    expect(projectsPage.dialogErrors.value.title).toBeNull();

    projectsPage.setDialogProjectId("project-1");
    await projectsPage.saveDialog();

    expect(client.createTask).not.toHaveBeenCalled();
    expect(projectsPage.isDialogOpen.value).toBe(true);
    expect(projectsPage.dialogErrors.value.projectId).toBeNull();
    expect(projectsPage.dialogErrors.value.title).toBeTruthy();
  });

  it("updates a task from the authoritative response and closes the edit dialog", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce(createProjectList());
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters", {
        updatedAt: "2026-04-21T10:00:00.000Z",
      }),
    ]);
    client.updateTask.mockResolvedValueOnce(
      createTask("task-1", "project-1", "Review PM scope rules", {
        status: "closed",
        updatedAt: "2026-04-22T11:30:00.000Z",
      }),
    );

    const { client: mockedClient, projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    projectsPage.openEditDialog(
      createTask("task-1", "project-1", "Improve reports filters"),
    );
    projectsPage.setDialogTaskTitle("Review PM scope rules");
    projectsPage.setDialogTaskStatus("closed");
    await projectsPage.saveDialog();

    expect(mockedClient.updateTask).toHaveBeenCalledWith(
      "access-token",
      "task-1",
      {
        status: "closed",
        title: "Review PM scope rules",
      },
    );
    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toEqual([
      expect.objectContaining({
        id: "task-1",
        status: "closed",
        title: "Review PM scope rules",
        updatedAt: "2026-04-22T11:30:00.000Z",
      }),
    ]);
    expect(projectsPage.isDialogOpen.value).toBe(false);
  });

  it("keeps the dialog open when task mutations fail and exposes the request error", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce(createProjectList());
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.updateTask.mockRejectedValueOnce(new Error("conflict"));

    const { projectsPage } = mountProjectsPage({ client });

    await flushPromises();

    projectsPage.openEditDialog(
      createTask("task-1", "project-1", "Improve reports filters"),
    );
    projectsPage.setDialogTaskTitle("Updated title");
    await projectsPage.saveDialog();

    expect(projectsPage.isDialogOpen.value).toBe(true);
    expect(projectsPage.dialogRequestErrorMessage.value).toBe("conflict");
  });

  it("removes deleted tasks after confirmation success", async () => {
    const client = createClientMock();
    const confirm = { require: vi.fn() };

    client.listVisibleProjects.mockResolvedValueOnce(createProjectList());
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { projectsPage } = mountProjectsPage({ client, confirm });

    await flushPromises();

    const task = projectsPage.filteredProjectGroups.value[0]?.tasks[0];

    if (!task) {
      throw new Error("Expected seeded task");
    }

    projectsPage.requestDeleteTask(task);

    const options = confirm.require.mock.calls[0]?.[0];

    await options.accept();

    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toHaveLength(0);
  });

  it("keeps tasks visible after delete conflicts and surfaces the backend message", async () => {
    const client = createClientMock();
    const confirm = { require: vi.fn() };
    const toast = { add: vi.fn() };

    client.listVisibleProjects.mockResolvedValueOnce(createProjectList());
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.deleteTask.mockRejectedValueOnce(
      new Error("Task has related time entries"),
    );

    const { projectsPage } = mountProjectsPage({ client, confirm, toast });

    await flushPromises();

    const task = projectsPage.filteredProjectGroups.value[0]?.tasks[0];

    if (!task) {
      throw new Error("Expected seeded task");
    }

    projectsPage.requestDeleteTask(task);

    const options = confirm.require.mock.calls[0]?.[0];

    await options.accept();

    expect(projectsPage.filteredProjectGroups.value[0]?.tasks).toHaveLength(1);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Task has related time entries",
        severity: "error",
        summary: "Could not delete task",
      }),
    );
  });
});

function createProjectList(): ProjectResponse[] {
  return [createProject("project-1", "Project Orion")];
}
