import { flushPromises, mount } from "@vue/test-utils";
import { h, defineComponent, nextTick } from "vue";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { nextLocalDay, startOfLocalDay } from "@gitiempo/web-shared/time";
import {
  createMemoryHistory,
  createRouter,
  type Router,
} from "vue-router";

import {
  parseTimeEntryUrlFilters,
  useTimeEntryFilters,
} from "./useTimeEntryFilters";

const TEST_IDS = {
  projectOne: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1001",
  projectTwo: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f1002",
  taskOne: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f2001",
} as const;

function createTestRouter(
  initialUrl: string,
): Promise<{ history: Router; unmount: () => void }> {
  const Host = defineComponent({ template: "<div />" }); // eslint-disable-line vue/one-component-per-file
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/time-entries", name: "timeEntries", component: Host },
      { path: "/", name: "dashboard", component: Host },
    ],
  });

  return router.push(initialUrl).then(() => ({ history: router, unmount: () => undefined }));
}

interface MountedComposable {
  history: Router;
  unmount: () => void;
  filters: ReturnType<typeof useTimeEntryFilters>;
}

function mountFilters(url: string): Promise<MountedComposable> {
  let filters!: ReturnType<typeof useTimeEntryFilters>;
  // eslint-disable-next-line vue/one-component-per-file
  const Host = defineComponent({
    setup() {
      filters = useTimeEntryFilters();

      return () => h("div");
    },
  });

  return createTestRouter(url).then(({ history, unmount }) => {
    const wrapper = mount(Host, { global: { plugins: [history] } });

    return {
      filters,
      history,
      unmount: () => {
        wrapper.unmount();
        unmount();
      },
    };
  });
}

function urlWith(query: Record<string, string>): string {
  const search = new URLSearchParams(query).toString();

  return search.length > 0 ? `/time-entries?${search}` : "/time-entries";
}

describe("parseTimeEntryUrlFilters", () => {
  it("keeps a full valid parameter set", () => {
    const filters = parseTimeEntryUrlFilters({
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T00:00:00.000Z",
      page: "3",
      projectId: TEST_IDS.projectOne,
      taskId: TEST_IDS.taskOne,
    });

    expect(filters).toEqual({
      dateFrom: "2026-04-01T00:00:00.000Z",
      dateTo: "2026-04-22T00:00:00.000Z",
      page: 3,
      projectId: TEST_IDS.projectOne,
      taskId: TEST_IDS.taskOne,
    });
  });

  it("discards invalid UUIDs without dropping the other filters", () => {
    const filters = parseTimeEntryUrlFilters({
      page: "2",
      projectId: "not-a-uuid",
      taskId: "1234567890abcdef1234567890abcdeg",
    });

    expect(filters).toEqual({ page: 2 });
  });

  it("discards out-of-range and non-numeric pages", () => {
    expect(parseTimeEntryUrlFilters({ page: "0" })).toEqual({});
    expect(parseTimeEntryUrlFilters({ page: "-4" })).toEqual({});
    expect(parseTimeEntryUrlFilters({ page: "abc" })).toEqual({});
    expect(
      parseTimeEntryUrlFilters({ page: "2.5" }),
    ).toEqual({});
  });

  it("keeps page values up to the max boundary and drops the value above it", () => {
    expect(parseTimeEntryUrlFilters({ page: "10000" })).toEqual({ page: 10000 });
    expect(parseTimeEntryUrlFilters({ page: "10001" })).toEqual({});
  });

  it("drops reversed date ranges while keeping the remaining filters", () => {
    const filters = parseTimeEntryUrlFilters({
      dateFrom: "2026-04-22T00:00:00.000Z",
      dateTo: "2026-04-01T00:00:00.000Z",
      projectId: TEST_IDS.projectOne,
    });

    expect(filters.dateFrom).toBeUndefined();
    expect(filters.dateTo).toBeUndefined();
    expect(filters.projectId).toBe(TEST_IDS.projectOne);
  });

  it("keeps partial parameter sets and ignores unknown keys", () => {
    const filters = parseTimeEntryUrlFilters({
      color: "red",
      projectId: TEST_IDS.projectTwo,
    });

    expect(filters).toEqual({ projectId: TEST_IDS.projectTwo });
  });

  it("ignores empty and array-valued query entries", () => {
    const filters = parseTimeEntryUrlFilters({
      page: "",
      projectId: ["", TEST_IDS.projectOne],
    });

    expect(filters).toEqual({ projectId: TEST_IDS.projectOne });
  });
});

const mounted: (() => void)[] = [];

afterEach(() => {
  while (mounted.length > 0) {
    mounted.pop()?.();
  }
});

describe("useTimeEntryFilters URL hydration and sync", () => {

  it("hydrates filter state from the route query on initialization", async () => {
    const session = await mountFilters(
      urlWith({
        dateFrom: "2026-04-01T00:00:00.000Z",
        dateTo: "2026-04-22T00:00:00.000Z",
        page: "2",
        projectId: TEST_IDS.projectOne,
        taskId: TEST_IDS.taskOne,
      }),
    );
    mounted.push(session.unmount);
    const { filters } = session;

    await flushPromises();

    expect(filters.isUrlHydrated.value).toBe(true);
    expect(filters.currentPage.value).toBe(2);
    expect(filters.selectedProjectId.value).toBe(TEST_IDS.projectOne);
    expect(filters.selectedDateRange.value).toEqual([
      new Date("2026-04-01T00:00:00.000Z"),
      new Date("2026-04-21T00:00:00.000Z"),
    ]);
    expect(filters.selectedTaskId.value).toBe(TEST_IDS.taskOne);

    await nextTick();
  });

  it("stays unfiltered when the URL has no filter parameters", async () => {
    const session = await mountFilters("/time-entries");
    mounted.push(session.unmount);

    await flushPromises();

    expect(session.filters.currentPage.value).toBe(1);
    expect(session.filters.selectedProjectId.value).toBeNull();
    expect(session.filters.selectedDateRange.value).toBeNull();
    expect(session.filters.selectedTaskId.value).toBeNull();
  });

  it("updates the URL with replace for control-driven filter changes", async () => {
    const session = await mountFilters("/time-entries");
    mounted.push(session.unmount);
    const { filters, history } = session;
    const replaceSpy = vi.spyOn(history, "replace");
    const pushSpy = vi.spyOn(history, "push");

    await flushPromises();

    filters.setProjectValue({
      defaultBillableForTasks: false,
      id: TEST_IDS.projectTwo,
      isActive: true,
      name: "Project Two",
    } as never);

    await flushPromises();
    await flushPromises();

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
    const replaceQuery = replaceSpy.mock.calls.at(-1)?.[0];

    expect(replaceQuery).toEqual({
      query: { projectId: TEST_IDS.projectTwo },
    });

    filters.setPage(4);

    await flushPromises();

    expect(replaceSpy.mock.calls.at(-1)?.[0]).toEqual({
      query: { page: "4", projectId: TEST_IDS.projectTwo },
    });

    filters.setProjectValue(null);

    await flushPromises();

    expect(replaceSpy.mock.calls.at(-1)?.[0]).toEqual({ query: {} });
  });

  it("does not poll the URL with page=1 or unset filters", async () => {
    const session = await mountFilters("/time-entries");
    mounted.push(session.unmount);
    const { filters, history } = session;
    const replaceSpy = vi.spyOn(history, "replace");

    await flushPromises();

    filters.setPage(1);

    await flushPromises();

    expect(replaceSpy.mock.calls.at(-1)?.[0]).toEqual({ query: {} });
  });

  it("applies navigation query filters without changing the router", async () => {
    const session = await mountFilters("/time-entries");
    mounted.push(session.unmount);
    const { filters, history } = session;
    const pushSpy = vi.spyOn(history, "push");
    const replaceSpy = vi.spyOn(history, "replace");

    await flushPromises();

    filters.applyFiltersFromNavigation({
      projectId: TEST_IDS.projectOne,
      taskId: TEST_IDS.taskOne,
    });

    await flushPromises();

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(filters.isUrlHydrated.value).toBe(true);
    expect(filters.selectedProjectId.value).toBe(TEST_IDS.projectOne);
    expect(filters.selectedTaskId.value).toBe(TEST_IDS.taskOne);
  });

  it("round-trips control-driven filters back through parsing", async () => {
    const session = await mountFilters("/time-entries");
    mounted.push(session.unmount);
    const { filters, history } = session;

    await flushPromises();

    filters.setDateRange([
      new Date(2026, 3, 10, 4, 30, 0, 0),
      new Date(2026, 3, 12, 15, 0, 0, 0),
    ]);

    await flushPromises();

    const query = history.currentRoute.value.query;
    const expectedDateFrom = startOfLocalDay(new Date(2026, 3, 10)).toISOString();
    const expectedDateTo = nextLocalDay(new Date(2026, 3, 12)).toISOString();

    expect(parseTimeEntryUrlFilters(query)).toEqual({
      dateFrom: expectedDateFrom,
      dateTo: expectedDateTo,
    });

    filters.applyFiltersFromNavigation(query);

    expect(filters.selectedDateRange.value?.[0]).toEqual(new Date(expectedDateFrom));
    expect(filters.selectedDateRange.value?.[1]?.getFullYear()).toBe(2026);
    expect(filters.selectedDateRange.value?.[1]?.getMonth()).toBe(3);
    expect(filters.selectedDateRange.value?.[1]?.getDate()).toBe(12);
  });
});

describe("useTimeEntryFilters across the March DST transition", () => {
  beforeAll(() => {
    vi.stubEnv("TZ", "Europe/Berlin");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the exclusive dateTo boundary stable through the March DST shift", async () => {
    const session = await mountFilters("/time-entries");
    mounted.push(session.unmount);
    const { filters, history } = session;

    await flushPromises();

    filters.setDateRange([
      new Date(2026, 2, 28, 12, 0, 0, 0),
      new Date(2026, 2, 31, 12, 0, 0, 0),
    ]);

    await flushPromises();

    const query = history.currentRoute.value.query;
    const expectedDateFrom = startOfLocalDay(new Date(2026, 2, 28)).toISOString();
    const expectedDateTo = nextLocalDay(new Date(2026, 2, 31)).toISOString();

    expect(query.dateFrom).toBe(expectedDateFrom);
    expect(query.dateTo).toBe(expectedDateTo);

    filters.applyFiltersFromNavigation(query);

    const [startDate, endDate] = filters.selectedDateRange.value ?? [];

    expect(startDate?.getFullYear()).toBe(2026);
    expect(startDate?.getMonth()).toBe(2);
    expect(startDate?.getDate()).toBe(28);
    expect(endDate?.getFullYear()).toBe(2026);
    expect(endDate?.getMonth()).toBe(2);
    expect(endDate?.getDate()).toBe(31);
  });
});
