import { mount, type VueWrapper } from "@vue/test-utils";
import type { ProjectResponse, TimeEntryResponse } from "@gitiempo/shared";
import TimeEntryDialogConnection from "@/components/time-entries/TimeEntryDialogConnection.vue";
import type * as QueryModule from "@/composables/query";
import { createPinia } from "pinia";
import { computed, defineComponent, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardOverview from "./DashboardOverview.vue";

const pageState = ref<"empty" | "loading" | "ready" | "request-error">("ready");
const requestErrorMessage = ref<string | null>(null);
const retryLoadOverview = vi.fn(async () => undefined);
const routerPush = vi.fn(async () => undefined);
const startTimerForEntry = vi.fn(async () => undefined);
const stopTimerForEntry = vi.fn(async () => undefined);
const wrappers: VueWrapper[] = [];
const closeDialog = vi.fn();
const openEditDialog = vi.fn(async () => undefined);
const requestDeleteDialogEntry = vi.fn(async () => undefined);
const requestOpen = vi.fn();
const saveDialog = vi.fn(async () => undefined);
const isDialogOpen = ref(false);
const hasConfirmedActiveTimerState = ref(false);
const editingEntry = ref<TimeEntryResponse | null>(null);
const visibleProjectsState = ref<ProjectResponse[]>([]);
const focusViewAll = vi.fn();

function createRecentEntryRows() {
  return [
    {
      description: null,
      durationLabel: "1h 10m",
      entry: {
        id: "entry-1",
        description: null,
        task: { id: "task-1", title: "Fix export column order" },
        taskTitle: "Fix export column order",
        project: { id: "project-1", name: "Billing API" },
        projectName: "Billing API",
        timerEntry: { endedAt: null, id: "entry-1", task: { title: "Fix export column order" }, taskId: "task-1" },
      },
      id: "entry-1",
      isHighlighted: true,
      projectName: "Billing API",
      taskTitle: "Fix export column order",
      timerEntry: {
        endedAt: null,
        id: "entry-1",
        task: { title: "Fix export column order" },
        taskId: "task-1",
      },
      timeRangeLabel: "09:00 - 10:10",
    },
    {
      description: null,
      durationLabel: "00:40:00",
      entry: {
        id: "entry-2",
        description: null,
        task: { id: "task-2", title: "Improve reports filters" },
        project: { id: "project-2", name: "Project Orion" },
      },
      id: "entry-2",
      isHighlighted: false,
      projectName: "Project Orion",
      taskTitle: "Improve reports filters",
      timerEntry: {
        endedAt: "2026-04-21T11:00:00.000Z",
        id: "entry-2",
        task: { title: "Improve reports filters" },
        taskId: "task-2",
      },
      timeRangeLabel: "10:20 - Running",
    },
  ];
}

const recentEntryRowsState = ref(createRecentEntryRows());

const DashboardRecentEntriesCardStub = defineComponent({
  name: "DashboardRecentEntriesCard",
  props: {
    entries: { type: Array, default: () => [] },
    isStartTimerDisabled: { type: Boolean, default: false },
    showStopFirstGuidance: { type: Boolean, default: false },
    startingTimerEntryId: { type: String, default: null },
    stoppingTimerEntryId: { type: String, default: null },
  },
  emits: ["editEntry", "openActiveTimer", "startTimer", "stopTimer", "view-all"],
  setup(_props, { expose }) {
    expose({ focusViewAll });
  },
  template: `
    <section data-testid="dashboard-recent-entries-card">
      <h2>Recent Time Entries</h2>
      <div v-for="entry in entries" :key="entry.id">
        <span>{{ entry.projectName }}</span>
        <span>{{ entry.taskTitle }}</span>
        <span>{{ entry.durationLabel }}</span>
      </div>
      <button data-testid="dashboard-recent-stop" type="button" @click="$emit('stopTimer', entries[0].timerEntry)">Stop timer</button>
      <button data-testid="dashboard-recent-start" type="button" @click="$emit('startTimer', entries[1].timerEntry)">Start timer</button>
      <button data-testid="dashboard-recent-view-all" type="button" @click="$emit('view-all')">View all</button>
      <button data-testid="dashboard-recent-edit-entry" type="button" @click="$emit('editEntry', entries[0].entry)">Edit entry</button>
      <button data-testid="dashboard-recent-open-timer" type="button" @click="$emit('openActiveTimer', 'test-entry-id')">Open active timer</button>
    </section>
  `,
});

vi.mock("vue-router", async () => {
  const actual = await vi.importActual("vue-router");

  return {
    ...actual,
    useRouter: () => ({ push: routerPush }),
  };
});

vi.mock("@/config/clients", () => ({
  createDefaultTimeEntriesClient: () => ({}),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: vi.fn() }),
}));

vi.mock("@/composables/query", async (importOriginal) => {
  const actual = await importOriginal<typeof QueryModule>();

  return {
    ...actual,
    useVisibleProjectsQuery: () => ({
      data: computed(() => visibleProjectsState.value),
      error: ref(null),
      isPending: computed(() => false),
      refetch: vi.fn(async () => ({ data: [] as ProjectResponse[] })),
    }),
  };
});

vi.mock("@/composables/time-entries/useTimeEntryDialog", () => ({
  useTimeEntryDialog: () => ({
    closeDialog,
    dialogDescription: ref(""),
    dialogEndedAt: ref<string | null>(null),
    dialogErrors: computed(() => ({})),
    dialogIsBillable: ref(false),
    dialogMode: ref<"create" | "edit">("edit"),
    dialogNewTaskTitle: ref(""),
    dialogProjectId: ref<string | null>(null),
    dialogRequestErrorMessage: ref<string | null>(null),
    dialogSaveLabel: ref("Save"),
    dialogStartedAt: ref<string | null>(null),
    dialogSubtitle: ref(""),
    dialogTasksErrorMessage: ref<string | null>(null),
    dialogTaskSuggestions: computed(() => []),
    dialogTaskValue: ref(null),
    dialogTitle: ref("Edit time entry"),
    editingEntry,
    isDialogOpen,
    isLoadingDialogTasks: ref(false),
    setDescription: vi.fn(),
    setEndedAt: vi.fn(),
    setIsBillable: vi.fn(),
    setNewTaskTitle: vi.fn(),
    setStartedAt: vi.fn(),
  }),
}));

vi.mock("@/composables/time-entries/useTimeEntryDialogWorkflow", () => ({
  useTimeEntryDialogWorkflow: () => ({
    handleDialogTaskSearch: vi.fn(),
    canCreateDialogTask: computed(() => false),
    isDeletingDialogEntry: ref(false),
    isReconcilingDialogTarget: ref(false),
    isSavingDialogFlow: ref(false),
    openCreateDialog: vi.fn(async () => undefined),
    openEditDialog,
    requestDeleteDialogEntry,
    saveDialog,
    setDialogProjectId: vi.fn(async () => undefined),
    setDialogTaskValue: vi.fn(),
  }),
}));

vi.mock("@/composables/time-entries/useTimeEntryMutations", () => ({
  useTimeEntryMutations: () => ({}),
}));

vi.mock("@/composables/time-entries/useTimeEntryTaskOptions", () => ({
  useTimeEntryTaskOptions: () => ({}),
}));

vi.mock("@/composables/timer/useTopBarTimerDialogController", () => ({
  useTopBarTimerDialogController: () => ({
    openRequestId: { value: 0 },
    requestOpen,
  }),
}));

vi.mock("@/composables/dashboard/useDashboardOverview", () => ({
  useDashboardOverview: () => ({
    dashboardStats: computed(() => [
      { description: "1 project tracked today", label: "Today", value: "6h 40m" },
      { description: "4 entries tracked this week", label: "This Week", value: "28h 15m" },
      { description: "2 projects received tracked time", label: "Projects This Week", value: "2" },
    ]),
    hasConfirmedActiveTimer: computed(() => hasConfirmedActiveTimerState.value),
    pageState,
    recentEntryRows: computed(() => recentEntryRowsState.value),
    isDirectStartBlockedByCurrentTimer: computed(() => false),
    requestErrorMessage,
    retryLoadOverview,
    startingTimerEntryId: ref<string | null>(null),
    startTimerForEntry,
    stoppingTimerEntryId: ref<string | null>(null),
    stopTimerForEntry,
    verifyActiveTimerEntry: vi.fn().mockResolvedValue(true),
    weeklyFocus: computed(() => ({
      project: {
        description: "3h 45m tracked across 4 entries",
        entryCount: 4,
        label: "Top Project",
        shareLabel: "42% of your tracked time this week",
        sharePercent: 42,
        title: "Admin Web",
      },
      task: {
        description: "Project Orion • 2h 10m tracked",
        entryCount: 3,
        label: "Top Task",
        shareLabel: "3 entries contributed to this focus",
        sharePercent: 24,
        title: "Improve reports filters",
      },
    })),
  }),
}));

describe("DashboardOverview", () => {
  beforeEach(() => {
    pageState.value = "ready";
    requestErrorMessage.value = null;
    hasConfirmedActiveTimerState.value = false;
    editingEntry.value = null;
    visibleProjectsState.value = [];
    recentEntryRowsState.value = createRecentEntryRows();
    focusViewAll.mockReset();
    retryLoadOverview.mockClear();
    routerPush.mockClear();
    startTimerForEntry.mockClear();
    stopTimerForEntry.mockClear();
    closeDialog.mockClear();
    openEditDialog.mockClear();
    requestDeleteDialogEntry.mockClear();
    requestOpen.mockClear();
    saveDialog.mockClear();
    isDialogOpen.value = false;
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
  });

  function mountOverview(attachToBody = false) {
    const wrapper = mount(DashboardOverview, {
      ...(attachToBody ? { attachTo: document.body } : null),
      global: {
        plugins: [createPinia()],
        stubs: {
          Button: {
            props: ["label", "ariaLabel"],
            emits: ["click"],
            template:
              '<button type="button" :aria-label="ariaLabel ?? label" @click="$emit(\'click\')">{{ label }}</button>',
          },
          Column: {
            props: ["header"],
            template: '<div />',
          },
          DataTable: {
            props: ["value"],
            template: `
              <div data-testid="recent-entries-table">
                <div v-for="entry in value" :key="entry.id" data-testid="recent-entry-row">
                  <slot name="body" :data="entry" />
                </div>
                <slot />
              </div>
            `,
          },
          ProgressBar: {
            props: ["value"],
            template: '<div>{{ value }}</div>',
          },
          Skeleton: { template: "<div />" },
          StatCard: {
            props: ["label", "value", "description"],
            template: '<article><h3>{{ label }}</h3><p>{{ value }}</p><small>{{ description }}</small></article>',
          },
          SurfaceCard: {
            template: '<section data-testid="surface-card"><slot /></section>',
          },
          Tag: {
            props: ["value"],
            template: '<span>{{ value }}</span>',
          },
          DashboardOverviewLoading: {
            template: `
              <div data-testid="dashboard-loading-state">
                <div data-testid="dashboard-loading-stats" />
                <div data-testid="dashboard-loading-focus" />
                <div data-testid="dashboard-loading-recent-entries" />
              </div>
            `,
          },
          DashboardRecentEntriesCard: DashboardRecentEntriesCardStub,
          DashboardWeeklyFocusCard: {
            props: ["focus"],
            template: `
              <section data-testid="dashboard-weekly-focus-card">
                <h2>Top Focus This Week</h2>
                <div>{{ focus.project?.title }}</div>
                <div>{{ focus.task?.title }}</div>
                <div>{{ focus.project?.sharePercent }}</div>
              </section>
            `,
          },
          TimeEntryDialog: {
            props: ["isOpen"],
            emits: ["close", "save", "delete-entry"],
            template: `
              <div v-if="isOpen" data-testid="time-entry-dialog">
                <button data-testid="time-entry-dialog-close" type="button" @click="$emit('close')">Close</button>
                <button data-testid="time-entry-dialog-save" type="button" @click="$emit('save')">Save</button>
                <button data-testid="time-entry-dialog-delete" type="button" @click="$emit('delete-entry')">Delete</button>
              </div>
            `,
          },
        },
      },
    });

    wrappers.push(wrapper);

    return wrapper;
  }

  it(
    "renders the populated dashboard overview without duplicated header chrome",
    async () => {
      const wrapper = mountOverview();

      expect(wrapper.text()).not.toContain("Timer actions stay in the global top bar.");
      expect(wrapper.text()).toContain("6h 40m");
      expect(wrapper.text()).toContain("Admin Web");
      expect(wrapper.text()).toContain("Improve reports filters");
      expect(wrapper.text()).toContain("42");
      expect(wrapper.text()).toContain("Top Focus This Week");
      expect(wrapper.text()).toContain("Recent Time Entries");
      expect(wrapper.text()).toContain("View all");

      await wrapper.get('[data-testid="dashboard-recent-stop"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-recent-start"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-recent-view-all"]').trigger("click");

      expect(stopTimerForEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-1" }));
      expect(startTimerForEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-2" }));
      expect(routerPush).toHaveBeenCalledWith({ name: "time-entries" });
    },
    20_000,
  );

  it("renders the loading skeleton state", async () => {
    pageState.value = "loading";

    const wrapper = mountOverview();

    expect(wrapper.find('[data-testid="dashboard-loading-state"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dashboard-loading-stats"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dashboard-loading-focus"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dashboard-loading-recent-entries"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dashboard-ready-state"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="dashboard-empty-state"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="dashboard-request-error"]').exists()).toBe(false);
  });

  it("renders distinct request-error and empty states", async () => {
    pageState.value = "request-error";
    requestErrorMessage.value = "network down";
    const errorWrapper = mountOverview();

    expect(errorWrapper.text()).toContain("Could not load dashboard overview");
    expect(errorWrapper.text()).toContain("network down");

    await errorWrapper.get("button").trigger("click");

    expect(retryLoadOverview).toHaveBeenCalledTimes(1);

    pageState.value = "empty";
    requestErrorMessage.value = null;
    const emptyWrapper = mountOverview();

    expect(emptyWrapper.text()).toContain("No recent time activity yet");
    expect(emptyWrapper.text()).not.toContain("Could not load dashboard overview");

    await emptyWrapper.get("button").trigger("click");

    expect(routerPush).toHaveBeenCalledWith({ name: "time-entries" });
  });

  it("forwards the card edit-entry action to the dialog workflow", async () => {
    const wrapper = mountOverview();

    await wrapper.get('[data-testid="dashboard-recent-edit-entry"]').trigger("click");

    expect(openEditDialog).toHaveBeenCalledTimes(1);
    expect(openEditDialog).toHaveBeenCalledWith(
      expect.objectContaining({ id: "entry-1" }),
    );
  });

  it("forwards the card open-active-timer action to the top-bar timer controller", async () => {
    const wrapper = mountOverview();

    await wrapper
      .get('[data-testid="dashboard-recent-open-timer"]')
      .trigger("click");

    expect(requestOpen).toHaveBeenCalledTimes(1);
  });

  it("opens the time entry dialog from the shared dialog state", async () => {
    const wrapper = mountOverview();

    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(false);

    isDialogOpen.value = true;
    await nextTick();

    expect(wrapper.find('[data-testid="time-entry-dialog"]').exists()).toBe(true);
  });

  it("wires the dialog close, save, and delete actions to the dialog composables", async () => {
    isDialogOpen.value = true;

    const wrapper = mountOverview();

    await wrapper.get('[data-testid="time-entry-dialog-close"]').trigger("click");
    await wrapper.get('[data-testid="time-entry-dialog-save"]').trigger("click");
    await wrapper.get('[data-testid="time-entry-dialog-delete"]').trigger("click");

    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(saveDialog).toHaveBeenCalledTimes(1);
    expect(requestDeleteDialogEntry).toHaveBeenCalledTimes(1);
  });

  it("passes the stop-first guidance state to the recent-entries card", () => {
    const wrapper = mountOverview();
    const recentEntriesCard = wrapper.getComponent(DashboardRecentEntriesCardStub);

    expect(recentEntriesCard.props("showStopFirstGuidance")).toBe(false);
  });

  it("marks stop-first guidance on the card while a running timer is confirmed", () => {
    hasConfirmedActiveTimerState.value = true;

    const wrapper = mountOverview();
    const recentEntriesCard = wrapper.getComponent(DashboardRecentEntriesCardStub);

    expect(recentEntriesCard.props("showStopFirstGuidance")).toBe(true);
  });

  it("passes only active projects to the time entry dialog connection", () => {
    visibleProjectsState.value = [
      { id: "project-1", isActive: true, name: "Billing API" } as ProjectResponse,
      { id: "project-2", isActive: false, name: "Archived Project" } as ProjectResponse,
    ];

    const wrapper = mountOverview();
    const connection = wrapper.getComponent(TimeEntryDialogConnection);

    expect(
      connection.props("projects").map((project) => project.id),
    ).toEqual(["project-1"]);
  });

  it("focuses View all after a successful delete while entries remain", async () => {
    editingEntry.value = { id: "entry-1" } as TimeEntryResponse;
    isDialogOpen.value = true;

    const wrapper = mountOverview();

    await wrapper.get('[data-testid="time-entry-dialog-delete"]').trigger("click");
    expect(requestDeleteDialogEntry).toHaveBeenCalledTimes(1);

    recentEntryRowsState.value = recentEntryRowsState.value.filter(
      (row) => row.id !== "entry-1",
    );
    isDialogOpen.value = false;
    await nextTick();
    await nextTick();

    expect(focusViewAll).toHaveBeenCalledTimes(1);
  });

  it("focuses Open Time Entries after a delete that empties the recent list", async () => {
    editingEntry.value = { id: "entry-1" } as TimeEntryResponse;
    isDialogOpen.value = true;

    const wrapper = mountOverview(true);

    await wrapper.get('[data-testid="time-entry-dialog-delete"]').trigger("click");

    recentEntryRowsState.value = [];
    pageState.value = "empty";
    isDialogOpen.value = false;
    await nextTick();
    await nextTick();

    const openTimeEntriesButton = wrapper
      .findAll("button")
      .find((candidate) => candidate.text() === "Open Time Entries");

    expect(openTimeEntriesButton).toBeDefined();
    expect(openTimeEntriesButton?.element).toBe(document.activeElement);
  });
});
