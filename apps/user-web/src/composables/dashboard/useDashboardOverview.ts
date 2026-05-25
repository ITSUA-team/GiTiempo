import type { TimeEntryResponse } from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import {
  useOwnTimeEntriesQuery,
  useRecentOwnTimeEntriesQuery,
} from "@gitiempo/web-shared/query";
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useDashboardOverviewViewModel } from "@/composables/dashboard/useDashboardOverviewViewModel";
import { getDashboardWeekWindow } from "@/lib/dashboard-overview-helpers";
import { useAuthStore } from "@/stores/auth";

export type {
  DashboardFocusItem,
  DashboardRecentEntryRow,
  DashboardStat,
  DashboardWeeklyFocus,
} from "@/lib/dashboard-overview-helpers";
export type { DashboardPageState } from "@/composables/dashboard/useDashboardOverviewViewModel";

type DashboardOverviewClient = Pick<TimeEntriesClient, "listOwnEntries">;

interface UseDashboardOverviewOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: DashboardOverviewClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

const defaultClient: DashboardOverviewClient = createTimeEntriesClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

export function useDashboardOverview(options: UseDashboardOverviewOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const nowMs = shallowRef(now());
  const weekEntries = shallowRef<TimeEntryResponse[]>([]);
  const weekEntriesError = shallowRef<unknown | null>(null);
  const isLoadingWeekEntries = shallowRef(true);
  const weekEntriesPage = shallowRef(1);
  const accessToken = computed(() => authStore.accessToken);
  const hasAccessToken = computed(() => Boolean(accessToken.value));
  const weekWindow = computed(() => getDashboardWeekWindow(nowMs.value));
  const recentEntriesQuery = useRecentOwnTimeEntriesQuery({
    accessToken,
    client,
  });
  const weekEntriesQuery = useOwnTimeEntriesQuery({
    accessToken,
    client,
    query: computed(() => ({
      dateFrom: weekWindow.value.dateFrom,
      dateTo: weekWindow.value.dateTo,
      limit: 100,
      page: weekEntriesPage.value,
    })),
    enabled: false,
  });
  const recentEntries = computed(() => recentEntriesQuery.data.value?.items ?? []);
  const queryError = computed(
    () => recentEntriesQuery.error.value ?? weekEntriesError.value ?? null,
  );
  const requestErrorMessage = computed(() =>
    queryError.value ? getErrorMessage(queryError.value) : null,
  );
  const isLoadingOverview = computed(
    () =>
      !hasAccessToken.value ||
      recentEntriesQuery.isPending.value ||
      isLoadingWeekEntries.value,
  );
  const dashboardViewModel = useDashboardOverviewViewModel({
    isLoadingOverview,
    nowMs,
    recentEntries,
    requestErrorMessage,
    weekEntries,
  });
  const {
    dashboardStats,
    pageState,
    recentEntryRows,
    weeklyFocus,
  } = dashboardViewModel;

  let intervalHandle: ReturnType<typeof setInterval> | null = null;

  async function loadWeekEntries(): Promise<void> {
    if (!hasAccessToken.value) {
      return;
    }

    const nextEntries: TimeEntryResponse[] = [];
    let currentPage = 1;
    let totalPages = 1;

    isLoadingWeekEntries.value = true;
    weekEntriesError.value = null;

    try {
      while (currentPage <= totalPages) {
        weekEntriesPage.value = currentPage;
        await nextTick();

        const result = await weekEntriesQuery.refetch({ throwOnError: true });

        if (!result.data) {
          throw result.error ?? new Error("Could not load weekly time entries.");
        }

        nextEntries.push(...result.data.items);
        totalPages = Math.max(result.data.meta.totalPages, 1);
        currentPage += 1;
      }

      weekEntries.value = nextEntries;
    } catch (error) {
      weekEntries.value = [];
      weekEntriesError.value = error;
    } finally {
      isLoadingWeekEntries.value = false;
    }
  }

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
      loadWeekEntries(),
    ]);
  }

  onMounted(() => {
    void loadWeekEntries();
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
