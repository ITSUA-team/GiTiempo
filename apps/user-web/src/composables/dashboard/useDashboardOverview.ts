import type { TimeEntryResponse } from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { useQuery } from "@tanstack/vue-query";
import { useRecentOwnTimeEntriesQuery } from "@/composables/query";
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { useToast } from "primevue/usetoast";
import { CancelledError } from "@tanstack/query-core";

import { createDefaultTimeEntriesClient } from "@/config/clients";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import {
  buildDashboardStats,
  buildDashboardWeeklyFocus,
  getDashboardPeriodWindow,
  getDashboardWeekWindow,
  mapDashboardRecentEntryRows,
  type DashboardFocusPeriod,
} from "@/lib/dashboard-overview-helpers";
import { resolveDataPageState } from "@/lib/page-state";
import { timeEntriesKeys } from "@/lib/query-keys";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { useAuthStore } from "@/stores/auth";
import { useTimeEntryDirectTimerActions } from "@/composables/time-entries/useTimeEntryDirectTimerActions";

export type {
  DashboardFocusItem,
  DashboardRecentEntryRow,
  DashboardStat,
  DashboardWeeklyFocus,
} from "@/lib/dashboard-overview-helpers";

type DashboardOverviewClient = Pick<
  TimeEntriesClient,
  "getCurrentTimer" | "listOwnEntries" | "startTimer" | "stopTimer"
>;

interface UseDashboardOverviewOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: DashboardOverviewClient;
  focusPeriod?: Ref<DashboardFocusPeriod>;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

const FOCUS_ENTRIES_PAGE_LIMIT = 100;

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
  const focusPeriod = options.focusPeriod ?? ref<DashboardFocusPeriod>("week");
  const weekWindow = computed(() => getDashboardWeekWindow(nowMs.value));
  const focusWindow = computed(() => getDashboardPeriodWindow(focusPeriod.value, nowMs.value));
  const weekEntriesQueryInput = computed(() => ({
    dateFrom: weekWindow.value.dateFrom,
    dateTo: weekWindow.value.dateTo,
    limit: FOCUS_ENTRIES_PAGE_LIMIT,
  }));
  const focusEntriesQueryInput = computed(() => ({
    dateFrom: focusWindow.value.dateFrom,
    dateTo: focusWindow.value.dateTo,
    limit: FOCUS_ENTRIES_PAGE_LIMIT,
  }));
  const recentEntriesQuery = useRecentOwnTimeEntriesQuery({
    client,
    enabled: hasAccessToken,
    queryKey: computed(() => timeEntriesKeys.list(scope.value, { limit: 10, page: 1 })),
    scope,
  });
  const weekEntriesQuery = usePaginatedEntriesQuery(
    weekEntriesQueryInput,
    client,
    hasAccessToken,
    scope,
  );
  const focusEntriesQuery = usePaginatedEntriesQuery(
    focusEntriesQueryInput,
    client,
    hasAccessToken,
    scope,
  );
  const recentEntries = computed(() => recentEntriesQuery.data.value?.items ?? []);
  const weekEntries = computed(() => weekEntriesQuery.data.value ?? []);
  const focusEntries = computed(() => focusEntriesQuery.data.value ?? []);
  const queryError = computed(
    () => recentEntriesQuery.error.value ?? weekEntriesQuery.error.value ?? null,
  );
  const focusQueryError = computed(() => focusEntriesQuery.error.value ?? null);
  const requestErrorMessage = computed(() =>
    queryError.value ? getErrorMessage(queryError.value) : null,
  );
  const focusRequestErrorMessage = computed(() =>
    focusQueryError.value ? getErrorMessage(focusQueryError.value) : null,
  );
  const focusLoading = computed(
    () => !hasAccessToken.value || focusEntriesQuery.isPending.value,
  );
  const isLoadingOverview = computed(
    () =>
      !hasAccessToken.value ||
      recentEntriesQuery.isPending.value ||
      weekEntriesQuery.isPending.value,
  );
  const focusPageState = computed(() =>
    resolveDataPageState({
      hasRequestError: focusRequestErrorMessage.value !== null,
      isEmpty: focusEntries.value.length === 0,
      isLoading: focusLoading.value,
    }),
  );
  const pageState = computed(() =>
    resolveDataPageState({
      hasRequestError: requestErrorMessage.value !== null,
      isEmpty: recentEntries.value.length === 0,
      isLoading: isLoadingOverview.value,
    }),
  );
  const dashboardStats = computed(() => buildDashboardStats(weekEntries.value, nowMs.value));
  const weeklyFocus = computed(() =>
    buildDashboardWeeklyFocus(focusEntries.value, nowMs.value, focusPeriod.value),
  );
  const recentEntryRows = computed(() =>
    mapDashboardRecentEntryRows(recentEntries.value, nowMs.value),
  );
  const directTimerActions = useTimeEntryDirectTimerActions({
    client,
    enabled: hasAccessToken,
    logFeature: "dashboard",
    loadEntries: retryLoadOverview,
    scope,
    toast,
  });

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

  async function retryFocusLoad(): Promise<void> {
    if (!hasAccessToken.value) {
      return;
    }

    await Promise.allSettled([focusEntriesQuery.refetch()]);
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
    focusLoading,
    focusPageState,
    focusPeriod,
    focusRequestErrorMessage,
    hasConfirmedActiveTimer: directTimerActions.hasConfirmedActiveTimer,
    isDirectStartBlockedByCurrentTimer: directTimerActions.isDirectStartBlockedByCurrentTimer,
    pageState,
    recentEntryRows,
    requestErrorMessage,
    retryFocusLoad,
    retryLoadOverview,
    startingTimerEntryId: directTimerActions.startingTimerEntryId,
    startTimerForEntry: directTimerActions.startTimerForEntry,
    stoppingTimerEntryId: directTimerActions.stoppingTimerEntryId,
    stopTimerForEntry: directTimerActions.stopTimerForEntry,
    verifyActiveTimerEntry: directTimerActions.verifyActiveTimerEntry,
    weeklyFocus,
  };
}

function usePaginatedEntriesQuery(
  queryInput: ComputedRef<{
    dateFrom: string;
    dateTo: string;
    limit: number;
  }>,
  client: DashboardOverviewClient,
  enabled: ComputedRef<boolean>,
  scope: ComputedRef<ReturnType<typeof getUserServerStateScope>>,
) {
  return useQuery({
    queryKey: computed(() => timeEntriesKeys.allList(scope.value, queryInput.value)),
    enabled,
    queryFn: async ({ signal }) => {
      const requestedInput = queryInput.value;
      const nextEntries: TimeEntryResponse[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const currentInput = queryInput.value;

        if (
          currentInput.dateFrom !== requestedInput.dateFrom ||
          currentInput.dateTo !== requestedInput.dateTo
        ) {
          throw new CancelledError({ revert: true, silent: true });
        }

        const result = await client.listOwnEntries({
          ...requestedInput,
          page: currentPage,
        }, { signal });

        nextEntries.push(...result.items);
        totalPages = Math.max(result.meta.totalPages, 1);
        currentPage += 1;
      }

      return nextEntries;
    },
  });
}
