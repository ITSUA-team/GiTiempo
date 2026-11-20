import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { routeNames } from "@/constants/routes";
import { getDashboardPeriodWindow, type DashboardWeeklyFocus } from "@/lib/dashboard-overview-helpers";
import {
  parseFocusPeriodQuery,
  useDashboardCardNavigation,
} from "./useDashboardCardNavigation";

const NOW_MS = new Date(2026, 3, 21, 11, 30, 0, 0).getTime();
const PERIOD_WINDOW_BY_PERIOD = {
  day: getDashboardPeriodWindow("day", NOW_MS),
  month: getDashboardPeriodWindow("month", NOW_MS),
  week: getDashboardPeriodWindow("week", NOW_MS),
} as const;

function createFocusFixture(
  overrides: Partial<DashboardWeeklyFocus> = {},
): DashboardWeeklyFocus {
  return {
    project: {
      description: "3h tracked across 4 entries",
      entryCount: 4,
      githubIssue: null,
      label: "Top Project",
      projectId: "project-orion",
      shareLabel: "42% of your tracked time this week",
      sharePercent: 42,
      title: "Project Orion",
    },
    task: {
      description: "Project Orion • 2h tracked",
      entryCount: 3,
      githubIssue: null,
      label: "Top Task",
      shareLabel: "3 entries contributed to this focus",
      sharePercent: 24,
      taskId: "task-reports",
      title: "Improve reports filters",
    },
    ...overrides,
  };
}

function createNavigation(
  focusPeriod: "day" | "month" | "week" = "week",
  weeklyFocus: DashboardWeeklyFocus = createFocusFixture(),
) {
  return useDashboardCardNavigation({
    focusPeriod: ref(focusPeriod),
    nowMs: ref(NOW_MS),
    weeklyFocus: ref(weeklyFocus),
  });
}

describe("useDashboardCardNavigation", () => {
  it("builds the Today route from the current browser-local day window", () => {
    const { todayRoute } = createNavigation();

    expect(todayRoute.value).toEqual({
      name: routeNames.timeEntries,
      query: {
        dateFrom: PERIOD_WINDOW_BY_PERIOD.day.dateFrom,
        dateTo: PERIOD_WINDOW_BY_PERIOD.day.dateTo,
      },
    });
  });

  it("builds the This Week route from the current browser-local week window", () => {
    const { thisWeekRoute } = createNavigation();

    expect(thisWeekRoute.value).toEqual({
      name: routeNames.timeEntries,
      query: {
        dateFrom: PERIOD_WINDOW_BY_PERIOD.week.dateFrom,
        dateTo: PERIOD_WINDOW_BY_PERIOD.week.dateTo,
      },
    });
    expect(Date.parse(PERIOD_WINDOW_BY_PERIOD.week.dateTo)).toBeGreaterThan(
      Date.parse(PERIOD_WINDOW_BY_PERIOD.week.dateFrom),
    );
  });

  it("builds the Projects This Week route with the week window and no project filter", () => {
    const { projectsThisWeekRoute } = createNavigation();

    expect(projectsThisWeekRoute.value).toEqual({
      name: routeNames.timeEntries,
      query: {
        dateFrom: PERIOD_WINDOW_BY_PERIOD.week.dateFrom,
        dateTo: PERIOD_WINDOW_BY_PERIOD.week.dateTo,
      },
    });
  });

  it("builds the Top Focus section route from the selected period window", () => {
    for (const period of ["day", "week", "month"] as const) {
      const navigation = createNavigation(period);

      expect(navigation.focusRoute.value).toEqual({
        name: routeNames.timeEntries,
        query: {
          dateFrom: PERIOD_WINDOW_BY_PERIOD[period].dateFrom,
          dateTo: PERIOD_WINDOW_BY_PERIOD[period].dateTo,
        },
      });
    }
  });

  it("recomputes routes when nowMs advances across a day boundary", () => {
    const nowMs = ref(NOW_MS);
    const navigation = useDashboardCardNavigation({
      focusPeriod: ref("week"),
      nowMs,
      weeklyFocus: ref(createFocusFixture()),
    });

    expect(navigation.todayRoute.value.query).toMatchObject({
      dateFrom: PERIOD_WINDOW_BY_PERIOD.day.dateFrom,
    });

    const nextDayMs = new Date(2026, 3, 22, 12, 0, 0, 0).getTime();
    const nextDayWindow = getDashboardPeriodWindow("day", nextDayMs);
    nowMs.value = nextDayMs;

    expect(nowMs.value).toBe(nextDayMs);
    expect(navigation.todayRoute.value.query).toEqual({
      dateFrom: nextDayWindow.dateFrom,
      dateTo: nextDayWindow.dateTo,
    });
    expect(navigation.todayRoute.value.query).not.toEqual(PERIOD_WINDOW_BY_PERIOD.day);
  });

  it("follows period changes in the Top Focus section route", () => {
    const focusPeriod = ref<"day" | "month" | "week">("week");
    const navigation = useDashboardCardNavigation({
      focusPeriod,
      nowMs: ref(NOW_MS),
      weeklyFocus: ref(createFocusFixture()),
    });

    expect(navigation.focusRoute.value.query).toMatchObject({
      dateFrom: PERIOD_WINDOW_BY_PERIOD.week.dateFrom,
    });

    focusPeriod.value = "month";

    expect(navigation.focusRoute.value.query).toMatchObject({
      dateFrom: PERIOD_WINDOW_BY_PERIOD.month.dateFrom,
      dateTo: PERIOD_WINDOW_BY_PERIOD.month.dateTo,
    });
  });

  it("scopes the Top Project route to the winning project ID for the selected period", () => {
    for (const period of ["day", "week", "month"] as const) {
      const { topProjectRoute } = createNavigation(period);

      expect(topProjectRoute.value).toEqual({
        name: routeNames.timeEntries,
        query: {
          dateFrom: PERIOD_WINDOW_BY_PERIOD[period].dateFrom,
          dateTo: PERIOD_WINDOW_BY_PERIOD[period].dateTo,
          projectId: "project-orion",
        },
      });
    }
  });

  it("keeps the winning project ID stable across route re-evaluations", () => {
    const { topProjectRoute } = createNavigation();

    const firstQuery = topProjectRoute.value.query;
    const secondQuery = topProjectRoute.value.query;

    expect(firstQuery).toEqual(secondQuery);
    expect(firstQuery).toHaveProperty("projectId", "project-orion");
  });

  it("falls back to the selected-period window when Top Project has no tracked project", () => {
    const { topProjectRoute, focusRoute } = createNavigation("month", createFocusFixture({ project: null }));

    expect(topProjectRoute.value).toEqual(focusRoute.value);
    expect(topProjectRoute.value.query).not.toHaveProperty("projectId");
  });

  it("scopes the Top Task route to the winning task ID for the selected period", () => {
    const { topTaskRoute } = createNavigation("day");

    expect(topTaskRoute.value).toEqual({
      name: routeNames.timeEntries,
      query: {
        dateFrom: PERIOD_WINDOW_BY_PERIOD.day.dateFrom,
        dateTo: PERIOD_WINDOW_BY_PERIOD.day.dateTo,
        taskId: "task-reports",
      },
    });
  });

  it("falls back to the selected-period window when Top Task has no tracked task", () => {
    const { topTaskRoute, focusRoute } = createNavigation("week", createFocusFixture({ task: null }));

    expect(topTaskRoute.value).toEqual(focusRoute.value);
    expect(topTaskRoute.value.query).not.toHaveProperty("taskId");
  });

  it("builds the Recent Time Entries route without any filters", () => {
    const { recentEntriesRoute } = createNavigation();

    expect(recentEntriesRoute.value).toEqual({
      name: routeNames.timeEntries,
      query: {},
    });
  });

  it("always starts destinations on page 1 by omitting the page parameter", () => {
    const navigation = createNavigation();

    for (const routeRef of [
      navigation.focusRoute,
      navigation.projectsThisWeekRoute,
      navigation.recentEntriesRoute,
      navigation.thisWeekRoute,
      navigation.todayRoute,
      navigation.topProjectRoute,
      navigation.topTaskRoute,
    ]) {
      expect(routeRef.value.name).toBe(routeNames.timeEntries);
      expect(routeRef.value.query).not.toHaveProperty("page");
    }
  });

  describe("parseFocusPeriodQuery", () => {
    it("accepts recognized focus period values", () => {
      expect(parseFocusPeriodQuery("day")).toBe("day");
      expect(parseFocusPeriodQuery("week")).toBe("week");
      expect(parseFocusPeriodQuery("month")).toBe("month");
    });

    it("rejects absent, invalid, and non-string values", () => {
      expect(parseFocusPeriodQuery(undefined)).toBeNull();
      expect(parseFocusPeriodQuery(null)).toBeNull();
      expect(parseFocusPeriodQuery("")).toBeNull();
      expect(parseFocusPeriodQuery("year")).toBeNull();
      expect(parseFocusPeriodQuery(["month"])).toBeNull();
      expect(parseFocusPeriodQuery(5)).toBeNull();
    });
  });
});
