import type { TimeEntryResponse } from "@gitiempo/shared";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import {
  buildDashboardStats,
  buildDashboardWeeklyFocus,
  mapDashboardRecentEntryRows,
} from "@/lib/dashboard-overview-helpers";

export type DashboardPageState = "empty" | "loading" | "ready" | "request-error";

interface UseDashboardOverviewViewModelOptions {
  isLoadingOverview: MaybeRefOrGetter<boolean>;
  nowMs: MaybeRefOrGetter<number>;
  recentEntries: MaybeRefOrGetter<TimeEntryResponse[]>;
  requestErrorMessage: MaybeRefOrGetter<string | null>;
  weekEntries: MaybeRefOrGetter<TimeEntryResponse[]>;
}

export function getDashboardPageState(options: {
  isLoadingOverview: boolean;
  recentEntryCount: number;
  requestErrorMessage: string | null;
}): DashboardPageState {
  if (options.isLoadingOverview) {
    return "loading";
  }

  if (options.requestErrorMessage) {
    return "request-error";
  }

  if (options.recentEntryCount === 0) {
    return "empty";
  }

  return "ready";
}

export function useDashboardOverviewViewModel(
  options: UseDashboardOverviewViewModelOptions,
) {
  const pageState = computed<DashboardPageState>(() =>
    getDashboardPageState({
      isLoadingOverview: toValue(options.isLoadingOverview),
      recentEntryCount: toValue(options.recentEntries).length,
      requestErrorMessage: toValue(options.requestErrorMessage),
    }),
  );
  const dashboardStats = computed(() =>
    buildDashboardStats(toValue(options.weekEntries), toValue(options.nowMs)),
  );
  const weeklyFocus = computed(() =>
    buildDashboardWeeklyFocus(toValue(options.weekEntries), toValue(options.nowMs)),
  );
  const recentEntryRows = computed(() =>
    mapDashboardRecentEntryRows(toValue(options.recentEntries), toValue(options.nowMs)),
  );

  return {
    dashboardStats,
    pageState,
    recentEntryRows,
    weeklyFocus,
  };
}
