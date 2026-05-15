// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { computed, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageState = shallowRef<"empty" | "loading" | "ready" | "request-error">(
  "ready",
);
const filteredProjectGroups = shallowRef([
  {
    project: {
      color: null,
      createdAt: "2026-04-20T12:00:00.000Z",
      description: null,
      id: "project-1",
      isActive: true,
      members: [],
      name: "Project Orion",
      source: "manual",
      totalHours: 12,
      updatedAt: "2026-04-20T12:00:00.000Z",
      visibility: "public",
      workspaceId: "workspace-1",
    },
    tasks: [
      {
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "task-1",
        isActive: true,
        projectId: "project-1",
        status: "open",
        title: "Improve reports filters",
        updatedAt: "2026-04-21T10:00:00.000Z",
        workspaceId: "workspace-1",
      },
    ],
  },
]);
const requestErrorMessage = shallowRef<string | null>(null);

const actions = {
  closeDialog: vi.fn(),
  openCreateDialog: vi.fn(),
  openEditDialog: vi.fn(),
  requestDeleteTask: vi.fn(),
  retryLoadPage: vi.fn(async () => undefined),
  saveDialog: vi.fn(async () => undefined),
  setDialogProjectId: vi.fn(),
  setDialogTaskStatus: vi.fn(),
  setDialogTaskTitle: vi.fn(),
  setSearchValue: vi.fn(),
};

vi.mock("@/composables/useProjectsPage", () => ({
  useProjectsPage: () => ({
    canCreateTasks: computed(() => true),
    closeDialog: actions.closeDialog,
    dialogErrors: shallowRef({ projectId: null, status: null, title: null }),
    dialogMode: shallowRef(null),
    dialogProjectId: shallowRef(null),
    dialogRequestErrorMessage: shallowRef(null),
    dialogSaveLabel: computed(() => "Create task"),
    dialogSubtitle: computed(() => "Create a task in one of your visible projects."),
    dialogTaskStatus: shallowRef("open"),
    dialogTaskTitle: shallowRef(""),
    dialogTitle: computed(() => "New task"),
    filteredProjectGroups,
    formatUpdatedLabel: () => "Today, 10:00",
    handleSearchComplete: vi.fn(),
    isDeletingTaskId: shallowRef<string | null>(null),
    isDialogOpen: computed(() => false),
    isLoadingProjects: shallowRef(false),
    isLoadingTasks: shallowRef(false),
    isSavingDialog: shallowRef(false),
    lastMutationErrorMessage: shallowRef(null),
    openCreateDialog: actions.openCreateDialog,
    openEditDialog: actions.openEditDialog,
    pageState,
    requestDeleteTask: actions.requestDeleteTask,
    requestErrorMessage,
    retryLoadPage: actions.retryLoadPage,
    saveDialog: actions.saveDialog,
    searchSuggestions: shallowRef([]),
    selectedSearchValue: shallowRef(null),
    setDialogProjectId: actions.setDialogProjectId,
    setDialogTaskStatus: actions.setDialogTaskStatus,
    setDialogTaskTitle: actions.setDialogTaskTitle,
    setSearchValue: actions.setSearchValue,
    taskLoadErrors: shallowRef({}),
    visibleProjects: shallowRef([]),
  }),
}));

describe("ProjectView", () => {
  beforeEach(() => {
    pageState.value = "ready";
    requestErrorMessage.value = null;
    actions.closeDialog.mockClear();
    actions.openCreateDialog.mockClear();
    actions.openEditDialog.mockClear();
    actions.requestDeleteTask.mockClear();
    actions.retryLoadPage.mockClear();
    actions.saveDialog.mockClear();
  });

  async function mountView() {
    const ProjectView = (await import("./ProjectView.vue")).default;

    return mount(ProjectView, {
      global: {
        stubs: {
          AutoComplete: {
            props: ["placeholder"],
            template: '<input :placeholder="placeholder" />',
          },
          Button: {
            props: ["label"],
            emits: ["click"],
            template:
              '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
          },
          ConfirmDialog: { template: "<div />" },
          Skeleton: { template: '<div data-testid="projects-skeleton" />' },
          ProjectTaskDialog: {
            emits: ["close", "save", "update:projectId", "update:status", "update:title"],
            template: '<div data-testid="project-task-dialog" />',
          },
          ProjectsTaskSection: {
            props: ["project", "tasks"],
            emits: ["addTask", "deleteTask", "editTask"],
            template: `
              <section>
                <p>{{ project.name }}</p>
                <button data-testid="project-section-add" type="button" @click="$emit('addTask', project.id)">Add</button>
                <button data-testid="project-section-edit" type="button" @click="$emit('editTask', tasks[0])">Edit</button>
                <button data-testid="project-section-delete" type="button" @click="$emit('deleteTask', tasks[0])">Delete</button>
              </section>
            `,
          },
          SurfaceCard: { template: "<section><slot /></section>" },
        },
      },
    });
  }

  it("renders the header, search field, grouped sections, and page-level actions", async () => {
    const wrapper = await mountView();

    expect(wrapper.text()).toContain("Projects");
    expect(wrapper.find('input[placeholder="Search projects or tasks"]').exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain("Project Orion");

    await wrapper.get('[data-testid="projects-header-create"]').trigger("click");
    await wrapper.get('[data-testid="project-section-add"]').trigger("click");
    await wrapper.get('[data-testid="project-section-edit"]').trigger("click");
    await wrapper.get('[data-testid="project-section-delete"]').trigger("click");

    expect(actions.openCreateDialog).toHaveBeenNthCalledWith(1);
    expect(actions.openCreateDialog).toHaveBeenNthCalledWith(2, "project-1");
    expect(actions.openEditDialog).toHaveBeenCalledTimes(1);
    expect(actions.requestDeleteTask).toHaveBeenCalledTimes(1);
  });

  it("renders distinct loading, request-error, and empty states", async () => {
    pageState.value = "loading";
    const loadingWrapper = await mountView();

    expect(loadingWrapper.findAll('[data-testid="projects-skeleton"]').length).toBeGreaterThan(0);
    expect(loadingWrapper.text()).not.toContain("Loading your projects.");
    expect(loadingWrapper.find('input[placeholder="Search projects or tasks"]').exists()).toBe(false);

    pageState.value = "request-error";
    requestErrorMessage.value = "network down";
    const errorWrapper = await mountView();

    expect(errorWrapper.text()).toContain("Could not load projects");
    expect(errorWrapper.text()).toContain("network down");

    pageState.value = "empty";
    requestErrorMessage.value = null;
    const emptyWrapper = await mountView();

    expect(emptyWrapper.text()).toContain("No projects or tasks match this view");
    expect(emptyWrapper.text()).not.toContain("Could not load projects");
  });
});
