import type { TimeEntryResponse } from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { useQuery } from "@tanstack/vue-query";
import { useRecentOwnTimeEntriesQuery } from "@/composables/query";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useToast } from "primevue/usetoast";

import { createDefaultTimeEntriesClient } from "@/config/clients";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import {
  buildDashboardStats,
  buildDashboardWeeklyFocus,
  getDashboardWeekWindow,
  mapDashboardRecentEntryRows,
} from "@/lib/dashboard-overview-helpers";
import { resolveDataPageState } from "@/lib/page-state";
import { timeEntriesKeys } from "@/lib/query-keys";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { useAuthStore } from "@/stores/auth";

export type {
  DashboardFocusItem,
  DashboardRecentEntryRow,
  DashboardStat,
  DashboardWeeklyFocus,
} from "@/lib/dashboard-overview-helpers";

type DashboardOverviewClient = Pick<TimeEntriesClient, "listOwnEntries">;

interface UseDashboardOverviewOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: DashboardOverviewClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

export function useDashboardOverview(options: UseDashboardOverviewOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? createDefaultTimeEntriesClient();
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const nowMs = ref(now());
  const accessToken = computed(() => authStore.accessToken);
  const scope = computed(() => getUserServerStateScope(authStore.accessToken));
  const hasAccessToken = computed(() => Boolean(accessToken.value));
  const weekWindow = computed(() => getDashboardWeekWindow(nowMs.value));
  const weekEntriesQueryInput = computed(() => ({
    dateFrom: weekWindow.value.dateFrom,
    dateTo: weekWindow.value.dateTo,
    limit: 100,
  }));
  const recentEntriesQuery = useRecentOwnTimeEntriesQuery({
    accessToken,
    client,
    queryKey: computed(() => timeEntriesKeys.list(scope.value, { limit: 10, page: 1 })),
    scope,
  });
  const weekEntriesQuery = useQuery({
    queryKey: computed(() =>
      timeEntriesKeys.allList(scope.value, weekEntriesQueryInput.value),
    ),
    enabled: hasAccessToken,
    queryFn: async ({ signal }) => {
      const nextEntries: TimeEntryResponse[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const result = await client.listOwnEntries({
          ...weekEntriesQueryInput.value,
          page: currentPage,
        }, { signal });

        nextEntries.push(...result.items);
        totalPages = Math.max(result.meta.totalPages, 1);
        currentPage += 1;
      }

      return nextEntries;
    },
  });
  const recentEntries = computed(() => recentEntriesQuery.data.value?.items ?? []);
  const weekEntries = computed(() => weekEntriesQuery.data.value ?? []);
  const queryError = computed(
    () => recentEntriesQuery.error.value ?? weekEntriesQuery.error.value ?? null,
  );
  const requestErrorMessage = computed(() =>
    queryError.value ? getErrorMessage(queryError.value) : null,
  );
  const isLoadingOverview = computed(
    () =>
      !hasAccessToken.value ||
      recentEntriesQuery.isPending.value ||
      weekEntriesQuery.isPending.value,
  );
  const pageState = computed(() =>
    resolveDataPageState({
      hasRequestError: requestErrorMessage.value !== null,
      isEmpty: recentEntries.value.length === 0,
      isLoading: isLoadingOverview.value,
    }),
  );
  const dashboardStats = computed(() => buildDashboardStats(weekEntries.value, nowMs.value));
  const weeklyFocus = computed(() => buildDashboardWeeklyFocus(weekEntries.value, nowMs.value));
  const recentEntryRows = computed(() =>
    mapDashboardRecentEntryRows(recentEntries.value, nowMs.value),
  );

  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  watch(queryError, (error) => {
    if (!error) {
      return;
    }

    appToast.showErrorToast({
      detail: "Refresh and try again.",
      error,
      logContext: { action: "load-overview", feature: "dashboard" },
      summary: "Could not load dashboard overview",
    });
  });

  async function retryLoadOverview(): Promise<void> {
    if (!hasAccessToken.value) {
      return;
    }

    await Promise.allSettled([
      recentEntriesQuery.refetch(),
      weekEntriesQuery.refetch(),
    ]);
  }

  onMounted(() => {
    intervalHandle = setIntervalFn(() => {
      nowMs.value = now();
    }, 1000);
  });

  onBeforeUnmount(() => {
    if (intervalHandle) {
      clearIntervalFn(intervalHandle);
      intervalHandle = null;
    }
  });

  return {
    dashboardStats,
    pageState,
    recentEntryRows,
    requestErrorMessage,
    retryLoadOverview,
    weeklyFocus,
  };
}
