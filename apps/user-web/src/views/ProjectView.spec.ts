import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type {
  ProjectResponse,
  TaskResponse,
  TimeEntryListResponse,
} from "@gitiempo/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TimeEntriesClient } from "@/services/time-entries-client";
import { createTestQueryPlugin } from "@/test/query-client";
import { useAuthStore } from "@/stores/auth";

const clientRef = vi.hoisted(() => ({
  current: null as unknown,
}));
const primeVueMocks = vi.hoisted(() => ({
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
}));
const ASSIGNEE_ID = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003";

vi.mock("@/config/clients", () => ({
  createDefaultTimeEntriesClient: () => clientRef.current,
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: primeVueMocks.confirmRequire }),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: primeVueMocks.toastAdd }),
}));

function createProject(
  id: string,
  name: string,
  isActive = true,
  overrides: Partial<ProjectResponse> = {},
): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive,
    members: [
      {
        avatarUrl: null,
        displayName: "Alexey Tsukanov",
        email: "alexey@example.com",
        role: "member",
        userId: ASSIGNEE_ID,
      },
    ],
    name,
    source: "manual",
    totalSeconds: 43200,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function createTask(
  id: string,
  projectId: string,
  title: string,
  overrides: Partial<TaskResponse> = {},
): TaskResponse {
  return {
    assignee: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    description: null,
    id,
    isActive: true,
    priority: "medium",
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
    createTask: vi.fn(async (projectId, input) =>
      createTask("task-new", projectId, input.title, {
        assignee: input.assigneeId
          ? {
              avatarUrl: null,
              displayName: "Alexey Tsukanov",
              email: "alexey@example.com",
              role: "member",
              userId: input.assigneeId,
            }
          : null,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        status: input.status ?? "open",
      }),
    ),
    deleteEntry: vi.fn(async () => undefined),
    deleteTask: vi.fn(async () => undefined),
    getCurrentTimer: vi.fn(async () => ({ timeEntry: null })),
    listOwnEntries: vi.fn(async (): Promise<TimeEntryListResponse> => ({
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
    updateTask: vi.fn(async (taskId, input) =>
      createTask(taskId, "project-1", input.title ?? "Updated task", {
        assignee: input.assigneeId
          ? {
              avatarUrl: null,
              displayName: "Alexey Tsukanov",
              email: "alexey@example.com",
              role: "member",
              userId: input.assigneeId,
            }
          : null,
        description: input.description ?? null,
        priority: input.priority ?? "medium",
        status: input.status ?? "open",
      }),
    ),
  };
}

async function mountView(client = createClientMock()) {
  const pinia = createPinia();

  setActivePinia(pinia);
  useAuthStore().accessToken = "access-token";
  clientRef.current = client;

  const ProjectView = (await import("./ProjectView.vue")).default;
  const wrapper = mount(ProjectView, {
    global: {
      plugins: [pinia, createTestQueryPlugin()],
      stubs: {
        AutoComplete: {
          emits: ["complete", "update:modelValue"],
          props: ["placeholder"],
          template: '<input :placeholder="placeholder" />',
        },
        Button: {
          emits: ["click"],
          props: ["disabled", "label"],
          template:
            '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
        },
        ProjectTaskDialog: {
          emits: [
            "close",
            "save",
            "update:assigneeId",
            "update:description",
            "update:priority",
            "update:projectId",
            "update:status",
            "update:title",
          ],
          props: [
            "assigneeId",
            "assigneeOptions",
            "description",
            "isOpen",
            "priority",
            "projectId",
            "requestErrorMessage",
            "valueTitle",
          ],
          template: `
            <div v-if="isOpen" data-testid="project-task-dialog">
              <p data-testid="dialog-title-value">{{ valueTitle }}</p>
              <p data-testid="dialog-description-value">{{ description }}</p>
              <p data-testid="dialog-priority-value">{{ priority }}</p>
              <p data-testid="dialog-assignee-value">{{ assigneeId }}</p>
              <p data-testid="dialog-request-error">{{ requestErrorMessage }}</p>
              <button data-testid="dialog-project-input" type="button" @click="$emit('update:projectId', 'project-2')">Project</button>
              <button data-testid="dialog-title-input" type="button" @click="$emit('update:title', 'Write release checklist')">Title</button>
              <button data-testid="dialog-edit-title-input" type="button" @click="$emit('update:title', 'Updated task')">Edit title</button>
              <button data-testid="dialog-description-input" type="button" @click="$emit('update:description', 'Coordinate release validation.')">Description</button>
              <button data-testid="dialog-clear-description-input" type="button" @click="$emit('update:description', '')">Clear description</button>
              <button data-testid="dialog-priority-input" type="button" @click="$emit('update:priority', 'high')">Priority</button>
              <button data-testid="dialog-status-input" type="button" @click="$emit('update:status', 'closed')">Status</button>
              <button data-testid="dialog-assignee-input" type="button" @click="$emit('update:assigneeId', assigneeOptions[0]?.value ?? null)">Assignee</button>
              <button data-testid="dialog-clear-assignee-input" type="button" @click="$emit('update:assigneeId', null)">Clear assignee</button>
              <button data-testid="dialog-save" type="button" @click="$emit('save')">Save</button>
              <button data-testid="dialog-close" type="button" @click="$emit('close')">Close</button>
            </div>
          `,
        },
        ProjectsTaskSection: {
          emits: ["addTask", "deleteTask", "editTask"],
          props: ["project", "tasks"],
          template: `
            <section>
              <p>{{ project.name }}</p>
              <p v-for="task in tasks" :key="task.id">{{ task.title }}</p>
              <button data-testid="project-section-add" type="button" @click="$emit('addTask', project.id)">Add</button>
              <button data-testid="project-section-edit" type="button" @click="$emit('editTask', tasks[0])">Edit</button>
              <button data-testid="project-section-delete" type="button" @click="$emit('deleteTask', tasks[0])">Delete</button>
            </section>
          `,
        },
        Skeleton: { template: '<div data-testid="projects-skeleton" />' },
        SurfaceCard: { template: "<section><slot /></section>" },
      },
    },
  });

  return { client, wrapper };
}

describe("ProjectView", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    primeVueMocks.confirmRequire.mockClear();
    primeVueMocks.toastAdd.mockClear();
  });

  it("renders the search field, grouped sections, and project-level actions", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { wrapper } = await mountView(client);

    await flushPromises();

    expect(wrapper.text()).not.toContain(
      "Create, update, and organize tasks across your visible projects.",
    );
    expect(wrapper.find('input[placeholder="Search projects or tasks"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("Improve reports filters");

    await wrapper.get('[data-testid="project-section-add"]').trigger("click");
    await wrapper.get('[data-testid="project-section-edit"]').trigger("click");
    await wrapper.get('[data-testid="project-section-delete"]').trigger("click");

    expect(wrapper.find('[data-testid="project-task-dialog"]').exists()).toBe(true);
    expect(primeVueMocks.confirmRequire).toHaveBeenCalledTimes(1);
  });

  it("renders distinct loading, request-error, and empty states", async () => {
    const loadingClient = createClientMock();

    loadingClient.listVisibleProjects.mockImplementationOnce(
      async () => new Promise<ProjectResponse[]>(() => undefined),
    );
    const { wrapper: loadingWrapper } = await mountView(loadingClient);

    expect(loadingWrapper.findAll('[data-testid="projects-skeleton"]').length).toBeGreaterThan(0);
    expect(loadingWrapper.find('input[placeholder="Search projects or tasks"]').exists()).toBe(false);

    const errorClient = createClientMock();

    errorClient.listVisibleProjects.mockRejectedValueOnce(new Error("network down"));
    const { wrapper: errorWrapper } = await mountView(errorClient);

    await flushPromises();

    expect(errorWrapper.text()).toContain("Could not load projects");
    expect(errorWrapper.text()).toContain("network down");

    const emptyClient = createClientMock();
    const { wrapper: emptyWrapper } = await mountView(emptyClient);

    await flushPromises();

    expect(emptyWrapper.text()).toContain("No projects or tasks match this view");
    expect(emptyWrapper.text()).not.toContain("Could not load projects");
  });

  it("creates a task from a preselected project dialog and updates the local group", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValue([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([]).mockResolvedValueOnce([
      createTask("task-new", "project-1", "Write release checklist"),
    ]);

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-section-add"]').trigger("click");
    await wrapper.get('[data-testid="dialog-title-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-description-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-priority-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-status-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-assignee-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.createTask).toHaveBeenCalledWith("project-1", {
      assigneeId: ASSIGNEE_ID,
      description: "Coordinate release validation.",
      priority: "high",
      status: "closed",
      title: "Write release checklist",
    });
    expect(wrapper.text()).toContain("Write release checklist");
    expect(wrapper.find('[data-testid="project-task-dialog"]').exists()).toBe(false);
  });

  it("prefills and updates task metadata from the edit dialog", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters", {
        assignee: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          role: "member",
          userId: ASSIGNEE_ID,
        },
        description: "Existing details",
        priority: "low",
      }),
    ]);

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-section-edit"]').trigger("click");

    expect(wrapper.get('[data-testid="dialog-title-value"]').text()).toBe(
      "Improve reports filters",
    );
    expect(wrapper.get('[data-testid="dialog-description-value"]').text()).toBe(
      "Existing details",
    );
    expect(wrapper.get('[data-testid="dialog-priority-value"]').text()).toBe("low");
    expect(wrapper.get('[data-testid="dialog-assignee-value"]').text()).toBe(ASSIGNEE_ID);

    await wrapper.get('[data-testid="dialog-edit-title-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-clear-description-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-priority-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-status-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-clear-assignee-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.updateTask).toHaveBeenCalledWith("task-1", {
      assigneeId: null,
      description: null,
      priority: "high",
      status: "closed",
      title: "Updated task",
    });
  });

  it("clears a selected assignee when the create project changes", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
      createProject("project-2", "Project Apollo", true, { members: [] }),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-section-add"]').trigger("click");
    await wrapper.get('[data-testid="dialog-title-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-assignee-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-project-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.createTask).toHaveBeenCalledWith("project-2", {
      assigneeId: null,
      description: null,
      priority: "medium",
      status: "open",
      title: "Write release checklist",
    });
  });

  it("keeps the dialog open when task mutations fail and exposes the request error", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.updateTask.mockRejectedValueOnce(new Error("conflict"));

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-section-edit"]').trigger("click");
    await wrapper.get('[data-testid="dialog-edit-title-input"]').trigger("click");
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="project-task-dialog"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="dialog-request-error"]').text()).toBe("conflict");
  });

  it("removes deleted tasks after confirmation success", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-section-delete"]').trigger("click");

    const options = primeVueMocks.confirmRequire.mock.calls[0]?.[0];

    await options.accept();
    await flushPromises();

    expect(wrapper.text()).not.toContain("Improve reports filters");
  });

  it("keeps tasks visible after delete conflicts and surfaces the backend message", async () => {
    const client = createClientMock();

    client.listVisibleProjects.mockResolvedValueOnce([
      createProject("project-1", "Project Orion"),
    ]);
    client.listProjectTasks.mockResolvedValueOnce([
      createTask("task-1", "project-1", "Improve reports filters"),
    ]);
    client.deleteTask.mockRejectedValueOnce(
      new Error("Task has related time entries"),
    );

    const { wrapper } = await mountView(client);

    await flushPromises();
    await wrapper.get('[data-testid="project-section-delete"]').trigger("click");

    const options = primeVueMocks.confirmRequire.mock.calls[0]?.[0];

    await options.accept();
    await flushPromises();

    expect(wrapper.text()).toContain("Improve reports filters");
    expect(primeVueMocks.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Task has related time entries",
        severity: "error",
        summary: "Could not delete task",
      }),
    );
  });
});
