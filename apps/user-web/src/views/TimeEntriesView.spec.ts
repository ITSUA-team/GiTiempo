// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { computed, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageState = shallowRef<"empty" | "loading" | "ready" | "request-error">("ready");
const groupedEntries = shallowRef([
  {
    dateKey: "2026-04-21",
    heading: "Today, Apr 21",
    items: [
      {
        createdAt: "2026-04-21T10:30:00.000Z",
        description: null,
        durationSeconds: null,
        endedAt: null,
        id: "entry-running",
        isBillable: false,
        project: { id: "project-1", name: "Project Orion" },
        projectId: "project-1",
        source: "web",
        startedAt: "2026-04-21T09:00:00.000Z",
        task: { id: "task-1", title: "Improve reports filters" },
        taskId: "task-1",
        updatedAt: "2026-04-21T10:30:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "user-1",
        },
        userId: "user-1",
        workspaceId: "workspace-1",
      },
      {
        createdAt: "2026-04-21T10:30:00.000Z",
        description: "Updated note",
        durationSeconds: 5400,
        endedAt: "2026-04-21T10:30:00.000Z",
        id: "entry-completed",
        isBillable: false,
        project: { id: "project-1", name: "Project Orion" },
        projectId: "project-1",
        source: "manual",
        startedAt: "2026-04-21T09:00:00.000Z",
        task: { id: "task-1", title: "Improve reports filters" },
        taskId: "task-1",
        updatedAt: "2026-04-21T10:30:00.000Z",
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "user-1",
        },
        userId: "user-1",
        workspaceId: "workspace-1",
      },
    ],
  },
]);
const requestErrorMessage = shallowRef<string | null>(null);
const entries = shallowRef(groupedEntries.value[0]!.items);

const actions = {
  openCreateDialog: vi.fn(async () => undefined),
  openEditDialog: vi.fn(async () => undefined),
  requestDeleteEntry: vi.fn(),
  retryLoadEntries: vi.fn(async () => undefined),
};

vi.mock("@/composables/useTimeEntriesPage", () => ({
  useTimeEntriesPage: () => ({
    closeDialog: vi.fn(),
    currentPage: shallowRef(1),
    dialogDescription: shallowRef(""),
    dialogEndedAt: shallowRef(null),
    dialogErrors: shallowRef({
      description: null,
      endedAt: null,
      projectId: null,
      startedAt: null,
      taskId: null,
    }),
    dialogIsBillable: shallowRef(false),
    dialogMode: shallowRef(null),
    dialogProjectId: shallowRef(null),
    dialogRequestErrorMessage: shallowRef(null),
    dialogSaveLabel: computed(() => "Save entry"),
    dialogStartedAt: shallowRef(null),
    dialogSubtitle: computed(() => "Create a completed time entry without starting the global timer."),
    dialogTasksErrorMessage: shallowRef(null),
    dialogTaskSuggestions: shallowRef([]),
    dialogTaskValue: shallowRef(null),
    dialogTitle: computed(() => "New time entry"),
    entries,
    filterTaskSuggestions: shallowRef([]),
    filterTasksErrorMessage: shallowRef(null),
    formatDuration: (entry: { endedAt: string | null }) =>
      entry.endedAt === null ? "02:00:05" : "1h 30m",
    formatTimeRange: (entry: { endedAt: string | null }) =>
      entry.endedAt === null ? "09:00 - Running" : "09:00 - 10:30",
    groupedEntries,
    handleDialogTaskSearch: vi.fn(),
    handleFilterTaskSearch: vi.fn(),
    isDeletingEntry: shallowRef<string | null>(null),
    isDialogOpen: computed(() => false),
    isLoadingDialogTasks: shallowRef(false),
    isLoadingEntries: computed(() => pageState.value === "loading"),
    isLoadingFilterTasks: shallowRef(false),
    isLoadingProjects: shallowRef(false),
    isSavingDialog: shallowRef(false),
    openCreateDialog: actions.openCreateDialog,
    openEditDialog: actions.openEditDialog,
    pageSize: shallowRef(20),
    pageState,
    projectsErrorMessage: shallowRef(null),
    requestDeleteEntry: actions.requestDeleteEntry,
    requestErrorMessage,
    retryLoadEntries: actions.retryLoadEntries,
    saveDialog: vi.fn(async () => undefined),
    selectedDateRange: shallowRef(null),
    selectedProjectId: shallowRef(null),
    selectedTaskFilter: shallowRef(null),
    setDateRange: vi.fn(async () => undefined),
    setDialogDescription: vi.fn(),
    setDialogEndedAt: vi.fn(),
    setDialogIsBillable: vi.fn(),
    setDialogProjectId: vi.fn(async () => undefined),
    setDialogStartedAt: vi.fn(),
    setDialogTaskValue: vi.fn(),
    setPage: vi.fn(async () => undefined),
    setSelectedProjectId: vi.fn(async () => undefined),
    setSelectedTaskFilter: vi.fn(async () => undefined),
    totalRecords: shallowRef(2),
    visibleProjects: shallowRef([]),
  }),
}));

describe("TimeEntriesView", () => {
  beforeEach(() => {
    pageState.value = "ready";
    requestErrorMessage.value = null;
    entries.value = groupedEntries.value[0]!.items;
    actions.openCreateDialog.mockClear();
    actions.openEditDialog.mockClear();
    actions.requestDeleteEntry.mockClear();
    actions.retryLoadEntries.mockClear();
  });

  async function mountView() {
    const TimeEntriesView = (await import("./TimeEntriesView.vue")).default;

    return mount(TimeEntriesView, {
      global: {
        stubs: {
          AutoComplete: { template: "<input />" },
          Button: {
            props: ["label"],
            emits: ["click"],
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
          },
          Column: { template: "<div><slot /></div>" },
          ConfirmDialog: { template: "<div />" },
          DataTable: { template: "<div><slot /></div>" },
          DatePicker: { template: "<input />" },
          Paginator: { template: "<div />" },
          ProgressSpinner: { template: "<div />" },
          Select: { template: "<select />" },
          SurfaceCard: { template: "<section><slot /></section>" },
          TimeEntriesDaySection: {
            props: ["group"],
            emits: ["createForDay", "deleteEntry", "editEntry"],
            template: `
              <section>
                <button data-testid="time-entries-day-create-2026-04-21" type="button" @click="$emit('createForDay', group.dateKey)" />
                <button data-testid="time-entry-edit-entry-completed" type="button" @click="$emit('editEntry', group.items[1])" />
                <button data-testid="time-entry-delete-entry-completed" type="button" @click="$emit('deleteEntry', group.items[1])" />
                <p>Stop from the top bar</p>
              </section>
            `,
          },
          TimeEntryDialog: { template: "<div />" },
        },
      },
    });
  }

  it("wires the header and day-level create buttons and hides running entry edit/delete actions", async () => {
    const wrapper = await mountView();

    await wrapper.get('[data-testid="time-entries-header-create"]').trigger("click");
    await wrapper.get('[data-testid="time-entries-day-create-2026-04-21"]').trigger("click");
    await wrapper.get('[data-testid="time-entry-edit-entry-completed"]').trigger("click");
    await wrapper.get('[data-testid="time-entry-delete-entry-completed"]').trigger("click");

    expect(actions.openCreateDialog).toHaveBeenNthCalledWith(1);
    expect(actions.openCreateDialog).toHaveBeenNthCalledWith(2, "2026-04-21");
    expect(actions.openEditDialog).toHaveBeenCalledTimes(1);
    expect(actions.requestDeleteEntry).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Stop from the top bar");
    expect(wrapper.find('[data-testid="time-entry-edit-entry-running"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="time-entry-delete-entry-running"]').exists()).toBe(false);
  });

  it("renders distinct request-error and empty states", async () => {
    pageState.value = "request-error";
    requestErrorMessage.value = "network down";
    const errorWrapper = await mountView();

    expect(errorWrapper.text()).toContain("Could not load time entries");
    expect(errorWrapper.text()).toContain("network down");

    pageState.value = "empty";
    requestErrorMessage.value = null;
    const emptyWrapper = await mountView();

    expect(emptyWrapper.text()).toContain("No time entries match these filters");
    expect(emptyWrapper.text()).not.toContain("Could not load time entries");
  });
});
