import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import {
  useAllOwnTimeEntriesQuery,
  useRecentOwnTimeEntriesQuery,
} from "@gitiempo/web-shared/query";
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
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
  const accessToken = computed(() => authStore.accessToken);
  const hasAccessToken = computed(() => Boolean(accessToken.value));
  const weekWindow = computed(() => getDashboardWeekWindow(nowMs.value));
  const recentEntriesQuery = useRecentOwnTimeEntriesQuery({
    accessToken,
    client,
  });
  const weekEntriesQuery = useAllOwnTimeEntriesQuery({
    accessToken,
    client,
    query: computed(() => ({
      dateFrom: weekWindow.value.dateFrom,
      dateTo: weekWindow.value.dateTo,
    })),
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
