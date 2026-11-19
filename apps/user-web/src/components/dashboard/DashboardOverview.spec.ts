import { mount, type VueWrapper } from "@vue/test-utils";
import { computed, reactive, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardOverview from "./DashboardOverview.vue";
import { routeNames } from "@/constants/routes";
import { getDashboardPeriodWindow } from "@/lib/dashboard-overview-helpers";

const pageState = ref<"empty" | "loading" | "ready" | "request-error">("ready");
const requestErrorMessage = ref<string | null>(null);
const focusLoading = ref(false);
const focusPageState = ref<"empty" | "loading" | "ready" | "request-error">("ready");
const focusRequestErrorMessage = ref<string | null>(null);
const focusPeriod = ref<"day" | "month" | "week">("week");
const retryLoadOverview = vi.fn(async () => undefined);
const retryFocusLoad = vi.fn(async () => undefined);
const routerPush = vi.fn(async (_route?: unknown) => undefined);
const routerReplace = vi.fn(async (_route?: unknown) => undefined);
const startTimerForEntry = vi.fn(async () => undefined);
const stopTimerForEntry = vi.fn(async () => undefined);
const routeMock = reactive<{ query: Record<string, unknown> }>({ query: {} });
const wrappers: VueWrapper[] = [];

const weeklyFocusFixture = {
  project: {
    description: "3h 45m tracked across 4 entries",
    entryCount: 4,
    label: "Top Project",
    projectId: "project-nav-focus",
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
    taskId: "task-nav-focus",
    title: "Improve reports filters",
  },
} as { project: Record<string, unknown> & { projectId?: string; title: string } | null; task: Record<string, unknown> & { taskId?: string; title: string } | null };

vi.mock("vue-router", async () => {
  const actual = await vi.importActual("vue-router");

  return {
    ...actual,
    useRoute: () => routeMock,
    useRouter: () => ({ push: routerPush, replace: routerReplace }),
  };
});

vi.mock("@/composables/dashboard/useDashboardOverview", () => ({
  useDashboardOverview: (_options: unknown) => ({
    dashboardStats: computed(() => [
      { description: "1 project tracked today", label: "Today", value: "6h 40m" },
      { description: "4 entries tracked this week", label: "This Week", value: "28h 15m" },
      { description: "2 projects received tracked time", label: "Projects This Week", value: "2" },
    ]),
    focusPeriod,
    focusLoading,
    focusPageState,
    focusRequestErrorMessage,
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
    retryFocusLoad,
    retryLoadOverview,
    startingTimerEntryId: ref<string | null>(null),
    startTimerForEntry,
    stoppingTimerEntryId: ref<string | null>(null),
    stopTimerForEntry,
    weeklyFocus: computed(() => weeklyFocusFixture),
  }),
}));

function periodWindow(period: "day" | "month" | "week") {
  return getDashboardPeriodWindow(period, Date.now());
}

function parseRoute(deeplink: unknown) {
  return JSON.parse(deeplink as string) as {
    name: string;
    query: Record<string, string>;
  };
}

describe("DashboardOverview", () => {
  beforeEach(() => {
    pageState.value = "ready";
    requestErrorMessage.value = null;
    focusLoading.value = false;
    focusPageState.value = "ready";
    focusRequestErrorMessage.value = null;
    focusPeriod.value = "week";
    retryLoadOverview.mockClear();
    retryFocusLoad.mockClear();
    routerPush.mockClear();
    routerReplace.mockClear();
    startTimerForEntry.mockClear();
    stopTimerForEntry.mockClear();
    routeMock.query = {};
    weeklyFocusFixture.project = null === weeklyFocusFixture.project ? null : {
      description: "3h 45m tracked across 4 entries",
      entryCount: 4,
      label: "Top Project",
      projectId: "project-nav-focus",
      shareLabel: "42% of your tracked time this week",
      sharePercent: 42,
      title: "Admin Web",
    };
    weeklyFocusFixture.task = null === weeklyFocusFixture.task ? null : {
      description: "Project Orion • 2h 10m tracked",
      entryCount: 3,
      label: "Top Task",
      shareLabel: "3 entries contributed to this focus",
      sharePercent: 24,
      taskId: "task-nav-focus",
      title: "Improve reports filters",
    };
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
          RouterLink: {
            props: ["to"],
            template: '<a :data-route="JSON.stringify(to)"><slot /></a>',
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
              "sectionRoute",
              "startingTimerEntryId",
              "stoppingTimerEntryId",
            ],
            emits: ["activate", "startTimer", "stopTimer", "view-all"],
            template: `
              <section data-testid="dashboard-recent-entries-card" :data-section-route="JSON.stringify(sectionRoute)">
                <h2>Recent Time Entries</h2>
                <div v-for="entry in entries" :key="entry.id">
                  <span>{{ entry.projectName }}</span>
                  <span>{{ entry.taskTitle }}</span>
                  <span>{{ entry.durationLabel }}</span>
                </div>
                <button data-testid="dashboard-recent-stop" type="button" @click="$emit('stopTimer', entries[0].timerEntry)">Stop timer</button>
                <button data-testid="dashboard-recent-start" type="button" @click="$emit('startTimer', entries[1].timerEntry)">Start timer</button>
                <button data-testid="dashboard-recent-activate" type="button" @click="$emit('activate')">Activate</button>
                <button data-testid="dashboard-recent-view-all" type="button" @click="$emit('view-all')">View all</button>
              </section>
            `,
          },
          DashboardWeeklyFocusCard: {
            props: ["focus", "focusPeriod", "loading", "errorMessage", "projectRoute", "sectionRoute", "taskRoute"],
            emits: ["activateProject", "activateSection", "activateTask", "retry", "update:focusPeriod"],
            template: `
              <section
                data-testid="dashboard-weekly-focus-card"
                :data-focus-period="focusPeriod"
                :data-loading="loading"
                :data-error-message="errorMessage"
                :data-section-route="JSON.stringify(sectionRoute)"
              >
                <h2>Top Focus</h2>
                <div>{{ focus.project?.title }}</div>
                <div>{{ focus.project?.sharePercent }}</div>
                <div>{{ focus.task?.title }}</div>
                <button data-testid="dashboard-focus-retry" type="button" @click="$emit('retry')">Retry</button>
                <button data-testid="dashboard-focus-period-day" type="button" @click="$emit('update:focusPeriod', 'day')">Day</button>
                <button data-testid="dashboard-focus-period-month" type="button" @click="$emit('update:focusPeriod', 'month')">Month</button>
                <button data-testid="dashboard-focus-activate-section" type="button" @click="$emit('activateSection')">Section</button>
                <button data-testid="dashboard-focus-activate-project" type="button" @click="$emit('activateProject')">Project</button>
                <button data-testid="dashboard-focus-activate-task" type="button" @click="$emit('activateTask')">Task</button>
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
      expect(wrapper.text()).toContain("Recent Time Entries");
      expect(wrapper.text()).toContain("View all");

      await wrapper.get('[data-testid="dashboard-recent-stop"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-recent-start"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-recent-view-all"]').trigger("click");

      expect(stopTimerForEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-1" }));
      expect(startTimerForEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "entry-2" }));
      expect(routerPush).toHaveBeenCalledWith({ name: routeNames.timeEntries });
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

    expect(routerPush).toHaveBeenCalledWith({ name: routeNames.timeEntries });
  });

  describe("card navigation destinations", () => {
    it("navigates the Today card to the current-day Time Entries window", async () => {
      const wrapper = mountOverview();
      const todayWindow = periodWindow("day");
      const link = wrapper
        .findAll('[data-testid="dashboard-stat-card-nav"]')
        .find((link) => link.attributes("aria-label") === "View time entries for today")!;

      const routeTarget = parseRoute(link.attributes("data-route"));

      expect(routeTarget).toEqual({
        name: routeNames.timeEntries,
        query: { dateFrom: todayWindow.dateFrom, dateTo: todayWindow.dateTo },
      });

      await link.trigger("keydown", { key: " " });

      expect(routerPush).toHaveBeenCalledTimes(1);

      expect(routerPush).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith({
        name: routeNames.timeEntries,
        query: { dateFrom: todayWindow.dateFrom, dateTo: todayWindow.dateTo },
      });
    });

    it("navigates the This Week and Projects This Week cards to the current week without a project filter", async () => {
      const wrapper = mountOverview();
      const weekWindow = periodWindow("week");
      const thisWeekLink = wrapper
        .findAll('[data-testid="dashboard-stat-card-nav"]')
        .find((link) => link.attributes("aria-label") === "View time entries for this week")!;
      const projectsLink = wrapper
        .findAll('[data-testid="dashboard-stat-card-nav"]')
        .find((link) =>
          link.attributes("aria-label") === "View time entries for projects tracked this week")!;

      expect(parseRoute(thisWeekLink.attributes("data-route"))).toEqual({
        name: routeNames.timeEntries,
        query: { dateFrom: weekWindow.dateFrom, dateTo: weekWindow.dateTo },
      });
      expect(parseRoute(projectsLink.attributes("data-route"))).toEqual(parseRoute(thisWeekLink.attributes("data-route")));

      await projectsLink.trigger("keydown", { key: " " });

      expect(routerPush).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith({
        name: routeNames.timeEntries,
        query: { dateFrom: weekWindow.dateFrom, dateTo: weekWindow.dateTo },
      });
    });

    it("navigates the Top Focus section, project, and task cards with selected-period scoping", async () => {
      const wrapper = mountOverview();

      const sectionRoute = parseRoute(
        wrapper.get('[data-testid="dashboard-weekly-focus-card"]').attributes("data-section-route")!,
      );
      const weekWindow = periodWindow("week");
      expect(sectionRoute).toEqual({
        name: routeNames.timeEntries,
        query: { dateFrom: weekWindow.dateFrom, dateTo: weekWindow.dateTo },
      });

      await wrapper.get('[data-testid="dashboard-focus-activate-section"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-focus-activate-project"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-focus-activate-task"]').trigger("click");

      expect(routerPush).toHaveBeenNthCalledWith(1, sectionRoute);
      expect(routerPush).toHaveBeenNthCalledWith(2, {
        ...sectionRoute,
        query: { ...sectionRoute.query, projectId: "project-nav-focus" },
      });
      expect(routerPush).toHaveBeenNthCalledWith(3, {
        ...sectionRoute,
        query: { ...sectionRoute.query, taskId: "task-nav-focus" },
      });
      expect((routerPush.mock.calls[2]?.[0] as { query: Record<string, unknown> }).query).not.toHaveProperty("search");
    });

    it("navigates empty Top Project and Top Task cards to period-only Time Entries", async () => {
      weeklyFocusFixture.project = null;
      weeklyFocusFixture.task = null;

      const wrapper = mountOverview();
      const weekWindow = periodWindow("week");

      await wrapper.get('[data-testid="dashboard-focus-activate-project"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-focus-activate-task"]').trigger("click");

      expect(routerPush).toHaveBeenNthCalledWith(1, {
        name: routeNames.timeEntries,
        query: { dateFrom: weekWindow.dateFrom, dateTo: weekWindow.dateTo },
      });
      expect(routerPush).toHaveBeenNthCalledWith(2, {
        name: routeNames.timeEntries,
        query: { dateFrom: weekWindow.dateFrom, dateTo: weekWindow.dateTo },
      });
      expect((routerPush.mock.calls[0]?.[0] as { query: Record<string, unknown> }).query).not.toHaveProperty("projectId");
      expect((routerPush.mock.calls[1]?.[0] as { query: Record<string, unknown> }).query).not.toHaveProperty("taskId");
    });

    it("navigates the Recent Time Entries card to unfiltered Time Entries", async () => {
      const wrapper = mountOverview();
      const recentCard = wrapper.get('[data-testid="dashboard-recent-entries-card"]');

      expect(parseRoute(recentCard.attributes("data-section-route")!)).toEqual({
        name: routeNames.timeEntries,
        query: {},
      });

      await recentCard.get('[data-testid="dashboard-recent-activate"]').trigger("click");

      expect(routerPush).toHaveBeenCalledWith({
        name: routeNames.timeEntries,
        query: {},
      });
    });

    it("keeps nested timer and view-all controls isolated from card navigation", async () => {
      const wrapper = mountOverview();

      await wrapper.get('[data-testid="dashboard-recent-stop"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-recent-start"]').trigger("click");
      await wrapper.get('[data-testid="dashboard-recent-view-all"]').trigger("click");

      expect(stopTimerForEntry).toHaveBeenCalledTimes(1);
      expect(startTimerForEntry).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith({ name: routeNames.timeEntries });
    });
  });

  describe("focus period selector", () => {
    it("defaults to Week and canonicalizes the URL when there is no focusPeriod", () => {
      const wrapper = mountOverview();

      expect(
        wrapper.get('[data-testid="dashboard-weekly-focus-card"]').attributes("data-focus-period"),
      ).toBe("week");
      expect(routerReplace).toHaveBeenCalledTimes(1);
      expect(routerReplace).toHaveBeenCalledWith({ query: { focusPeriod: "week" } });
      expect(routerPush).not.toHaveBeenCalled();
    });

    it("updates the URL without creating a history entry when the period changes", async () => {
      const wrapper = mountOverview();
      const statRoutes = wrapper
        .findAll('[data-testid="dashboard-stat-card-nav"]')
        .map((link) => link.attributes("data-route"));

      await wrapper.get('[data-testid="dashboard-focus-period-day"]').trigger("click");

      expect(routerReplace).toHaveBeenCalledTimes(2);
      expect(routerReplace).toHaveBeenLastCalledWith({ query: { focusPeriod: "day" } });
      expect(routerPush).not.toHaveBeenCalled();
      expect(
        wrapper.get('[data-testid="dashboard-weekly-focus-card"]').attributes("data-focus-period"),
      ).toBe("day");

      await wrapper.get('[data-testid="dashboard-focus-period-month"]').trigger("click");

      expect(routerReplace).toHaveBeenLastCalledWith({ query: { focusPeriod: "month" } });
      expect(routerPush).not.toHaveBeenCalled();

      const statRoutesAfter = wrapper
        .findAll('[data-testid="dashboard-stat-card-nav"]')
        .map((link) => link.attributes("data-route"));

      expect(statRoutesAfter).toEqual(statRoutes);
    });

    it("falls back to Week when the URL contains an invalid focusPeriod", () => {
      routeMock.query = { focusPeriod: "year" };

      const wrapper = mountOverview();

      expect(
        wrapper.get('[data-testid="dashboard-weekly-focus-card"]').attributes("data-focus-period"),
      ).toBe("week");
      expect(routerReplace).toHaveBeenCalledWith({ query: { focusPeriod: "week" } });
      expect(routerPush).not.toHaveBeenCalled();
    });

    it("restores the period from URL-driven history navigation without extra replaces", async () => {
      const wrapper = mountOverview();

      expect(routerReplace).toHaveBeenCalledTimes(1);

      routeMock.query = { focusPeriod: "month" };
      await wrapper.vm.$nextTick();

      expect(
        wrapper.get('[data-testid="dashboard-weekly-focus-card"]').attributes("data-focus-period"),
      ).toBe("month");
      expect(routerReplace).toHaveBeenCalledTimes(1);

      routeMock.query = { focusPeriod: "day" };
      await wrapper.vm.$nextTick();

      expect(
        wrapper.get('[data-testid="dashboard-weekly-focus-card"]').attributes("data-focus-period"),
      ).toBe("day");
      expect(routerReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe("weekly focus loading, error, and retry wiring", () => {
    it("passes the focus loading state through to the focus card instead of focus content", () => {
      focusLoading.value = true;
      focusPageState.value = "loading";

      const wrapper = mountOverview();
      const card = wrapper.get('[data-testid="dashboard-weekly-focus-card"]');

      expect(card.attributes("data-loading")).toBe("true");
    });

    it("passes the focus request error through to the focus card and retries on demand", async () => {
      focusPageState.value = "request-error";
      focusRequestErrorMessage.value = "Unable to load top focus entries";

      const wrapper = mountOverview();
      const card = wrapper.get('[data-testid="dashboard-weekly-focus-card"]');

      expect(card.attributes("data-error-message")).toBe("Unable to load top focus entries");

      await wrapper.get('[data-testid="dashboard-focus-retry"]').trigger("click");

      expect(retryFocusLoad).toHaveBeenCalledTimes(1);
    });
  });
});
