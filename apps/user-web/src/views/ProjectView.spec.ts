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
    totalSeconds: 43200,
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
    createTask: vi.fn(async (projectId, input) =>
      createTask("task-new", projectId, input.title),
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
          emits: ["close", "deleteTask", "save", "update:projectId", "update:status", "update:title"],
          props: [
            "isDeleting",
            "isOpen",
            "requestErrorMessage",
            "valueTitle",
          ],
          template: `
            <div v-if="isOpen" data-testid="project-task-dialog">
              <p data-testid="dialog-title-value">{{ valueTitle }}</p>
              <p data-testid="dialog-request-error">{{ requestErrorMessage }}</p>
              <button data-testid="dialog-title-input" type="button" @click="$emit('update:title', 'Write release checklist')">Title</button>
              <button data-testid="dialog-edit-title-input" type="button" @click="$emit('update:title', 'Updated task')">Edit title</button>
              <button data-testid="dialog-status-input" type="button" @click="$emit('update:status', 'closed')">Status</button>
              <button data-testid="dialog-delete" type="button" @click="$emit('deleteTask')">Delete task</button>
              <button data-testid="dialog-save" type="button" @click="$emit('save')">Save</button>
              <button data-testid="dialog-close" type="button" @click="$emit('close')">Close</button>
            </div>
          `,
        },
        ProjectsTaskSection: {
          emits: ["addTask", "editTask"],
          props: ["project", "tasks"],
          template: `
            <section>
              <p>{{ project.name }}</p>
              <p v-for="task in tasks" :key="task.id">{{ task.title }}</p>
              <button data-testid="project-section-add" type="button" @click="$emit('addTask', project.id)">Add</button>
              <button data-testid="project-section-title" type="button" @click="$emit('editTask', tasks[0])">{{ tasks[0]?.title }}</button>
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
    await wrapper.get('[data-testid="project-section-title"]').trigger("click");

    expect(wrapper.find('[data-testid="project-task-dialog"]').exists()).toBe(true);
    expect(primeVueMocks.confirmRequire).not.toHaveBeenCalled();
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
    await wrapper.get('[data-testid="dialog-save"]').trigger("click");
    await flushPromises();

    expect(client.createTask).toHaveBeenCalledWith("project-1", {
      title: "Write release checklist",
    });
    expect(wrapper.text()).toContain("Write release checklist");
    expect(wrapper.find('[data-testid="project-task-dialog"]').exists()).toBe(false);
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
    await wrapper.get('[data-testid="project-section-title"]').trigger("click");
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
    await wrapper.get('[data-testid="project-section-title"]').trigger("click");
    await wrapper.get('[data-testid="dialog-delete"]').trigger("click");

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
    await wrapper.get('[data-testid="project-section-title"]').trigger("click");
    await wrapper.get('[data-testid="dialog-delete"]').trigger("click");

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
