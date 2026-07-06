import { mount, type VueWrapper } from "@vue/test-utils";
import { computed, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardOverview from "./DashboardOverview.vue";

const pageState = ref<"empty" | "loading" | "ready" | "request-error">("ready");
const requestErrorMessage = ref<string | null>(null);
const retryLoadOverview = vi.fn(async () => undefined);
const routerPush = vi.fn(async () => undefined);
const startTimerForEntry = vi.fn(async () => undefined);
const stopTimerForEntry = vi.fn(async () => undefined);
const wrappers: VueWrapper[] = [];

vi.mock("vue-router", async () => {
  const actual = await vi.importActual("vue-router");

  return {
    ...actual,
    useRouter: () => ({ push: routerPush }),
  };
});

vi.mock("@/composables/dashboard/useDashboardOverview", () => ({
  useDashboardOverview: () => ({
    dashboardStats: computed(() => [
      { description: "1 project tracked today", label: "Today", value: "6h 40m" },
      { description: "4 entries tracked this week", label: "This Week", value: "28h 15m" },
      { description: "2 projects received tracked time", label: "Projects This Week", value: "2" },
    ]),
    pageState,
    recentEntryRows: computed(() => [
      {
        durationLabel: "1h 10m",
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
        durationLabel: "00:40:00",
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
    ]),
    isDirectStartBlockedByCurrentTimer: computed(() => false),
    requestErrorMessage,
    retryLoadOverview,
    startingTimerEntryId: ref<string | null>(null),
    startTimerForEntry,
    stoppingTimerEntryId: ref<string | null>(null),
    stopTimerForEntry,
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
    retryLoadOverview.mockClear();
    routerPush.mockClear();
    startTimerForEntry.mockClear();
    stopTimerForEntry.mockClear();
  });

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
  });

  function mountOverview() {
    const wrapper = mount(DashboardOverview, {
      global: {
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
          DashboardRecentEntriesCard: {
            props: [
              "entries",
              "isStartTimerDisabled",
              "startingTimerEntryId",
              "stoppingTimerEntryId",
            ],
            emits: ["startTimer", "stopTimer", "view-all"],
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
              </section>
            `,
          },
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
});
