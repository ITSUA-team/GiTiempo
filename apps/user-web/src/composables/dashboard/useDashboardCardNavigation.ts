import type { RouteLocationNamedRaw } from "vue-router";
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from "vue";

import {
  getDashboardPeriodWindow,
  type DashboardFocusPeriod,
  type DashboardWeeklyFocus,
} from "@/lib/dashboard-overview-helpers";
import { routeNames } from "@/constants/routes";

export const FOCUS_PERIOD_QUERY_VALUES = [
  "day",
  "week",
  "month",
] as const satisfies readonly DashboardFocusPeriod[];

/**
 * Maps a `focusPeriod` query value to a focus period, or null when the value
 * is absent or unrecognized.
 */
export function parseFocusPeriodQuery(value: unknown): DashboardFocusPeriod | null {
  if (typeof value !== "string") {
    return null;
  }

  return FOCUS_PERIOD_QUERY_VALUES.includes(value as DashboardFocusPeriod)
    ? (value as DashboardFocusPeriod)
    : null;
}

interface UseDashboardCardNavigationOptions {
  focusPeriod: Ref<DashboardFocusPeriod>;
  nowMs?: MaybeRefOrGetter<number>;
  weeklyFocus: Ref<DashboardWeeklyFocus>;
}

export interface DashboardCardNavigation {
  focusRoute: ComputedRef<RouteLocationNamedRaw>;
  projectsThisWeekRoute: ComputedRef<RouteLocationNamedRaw>;
  recentEntriesRoute: ComputedRef<RouteLocationNamedRaw>;
  thisWeekRoute: ComputedRef<RouteLocationNamedRaw>;
  todayRoute: ComputedRef<RouteLocationNamedRaw>;
  topProjectRoute: ComputedRef<RouteLocationNamedRaw>;
  topTaskRoute: ComputedRef<RouteLocationNamedRaw>;
}

function createTimeEntriesRoute(query: Record<string, string>): RouteLocationNamedRaw {
  return { name: routeNames.timeEntries, query };
}

export function useDashboardCardNavigation(
  options: UseDashboardCardNavigationOptions,
): DashboardCardNavigation {
  const nowMs = (): number =>
    options.nowMs === undefined ? Date.now() : toValue(options.nowMs);

  function buildPeriodRoute(period: DashboardFocusPeriod): RouteLocationNamedRaw {
    const window = getDashboardPeriodWindow(period, nowMs());

    return createTimeEntriesRoute({
      dateFrom: window.dateFrom,
      dateTo: window.dateTo,
    });
  }

  const todayRoute = computed(() => buildPeriodRoute("day"));
  const thisWeekRoute = computed(() => buildPeriodRoute("week"));
  const projectsThisWeekRoute = computed(() => thisWeekRoute.value);
  const focusRoute = computed(() => buildPeriodRoute(options.focusPeriod.value));
  const topProjectRoute = computed(() => {
    const route = buildPeriodRoute(options.focusPeriod.value);
    const projectId = options.weeklyFocus.value.project?.projectId;

    return projectId ? { ...route, query: { ...route.query, projectId } } : route;
  });
  const topTaskRoute = computed(() => {
    const route = buildPeriodRoute(options.focusPeriod.value);
    const taskId = options.weeklyFocus.value.task?.taskId;

    return taskId ? { ...route, query: { ...route.query, taskId } } : route;
  });
  const recentEntriesRoute = computed(() => createTimeEntriesRoute({}));

  return {
    focusRoute,
    projectsThisWeekRoute,
    recentEntriesRoute,
    thisWeekRoute,
    todayRoute,
    topProjectRoute,
    topTaskRoute,
  };
}
