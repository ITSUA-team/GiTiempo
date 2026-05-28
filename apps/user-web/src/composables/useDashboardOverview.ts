import type { TimeEntryResponse } from "@gitiempo/shared";
import { createAppToast, getErrorMessage, type ToastLike } from "@gitiempo/web-shared";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { useToast } from "primevue/usetoast";

import {
  createTimeEntriesClient,
  type TimeEntriesClient,
} from "@/services/time-entries-client";
import { useAuthStore } from "@/stores/auth";
import {
  subscribeToTimeEntryTimerSync,
  type TimeEntryTimerSyncEvent,
} from "@/composables/timeEntryTimerSync";
import { compareTimeEntriesByRecency } from "@/composables/timeEntryListOrder";

type DashboardOverviewClient = Pick<TimeEntriesClient, "listOwnEntries">;

export type DashboardPageState = "empty" | "loading" | "ready" | "request-error";

export interface DashboardStat {
  description: string;
  label: string;
  value: string;
}

export interface DashboardFocusItem {
  description: string;
  entryCount: number;
  label: string;
  shareLabel: string;
  sharePercent: number;
  title: string;
}

export interface DashboardWeeklyFocus {
  project: DashboardFocusItem | null;
  task: DashboardFocusItem | null;
}

export interface DashboardRecentEntryRow {
  durationLabel: string;
  id: string;
  isHighlighted: boolean;
  projectName: string;
  taskTitle: string;
  timeRangeLabel: string;
}

interface UseDashboardOverviewOptions {
  authStore?: ReturnType<typeof useAuthStore>;
  clearIntervalFn?: typeof clearInterval;
  client?: DashboardOverviewClient;
  now?: () => number;
  setIntervalFn?: typeof setInterval;
  toast?: ToastLike;
}

interface FocusAccumulator {
  descriptionLabel?: string;
  entryCount: number;
  label: string;
  seconds: number;
  title: string;
}

const defaultClient: DashboardOverviewClient = createTimeEntriesClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
});

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcIsoWeek(date: Date): Date {
  const utcDay = date.getUTCDay();
  const diffToMonday = utcDay === 0 ? 6 : utcDay - 1;

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diffToMonday),
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function formatCompactDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "0m";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatElapsedDuration(totalSeconds: number): string {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function formatUtcTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);

  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function getEntryEndMs(entry: TimeEntryResponse, nowMs: number): number {
  return entry.endedAt === null ? nowMs : new Date(entry.endedAt).getTime();
}

function getEntryTrackedSecondsWithinRange(
  entry: TimeEntryResponse,
  rangeStartMs: number,
  rangeEndMs: number,
  nowMs: number,
): number {
  const startedAtMs = new Date(entry.startedAt).getTime();
  const endedAtMs = getEntryEndMs(entry, nowMs);
  const overlapStartMs = Math.max(startedAtMs, rangeStartMs);
  const overlapEndMs = Math.min(endedAtMs, rangeEndMs);

  if (overlapEndMs <= overlapStartMs) {
    return 0;
  }

  return Math.floor((overlapEndMs - overlapStartMs) / 1000);
}

function formatRecentEntryDuration(entry: TimeEntryResponse, nowMs: number): string {
  if (entry.endedAt === null) {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((nowMs - new Date(entry.startedAt).getTime()) / 1000),
    );

    return formatElapsedDuration(elapsedSeconds);
  }

  return formatCompactDuration(entry.durationSeconds ?? 0);
}

function formatRecentEntryTimeRange(entry: TimeEntryResponse): string {
  const start = formatUtcTime(entry.startedAt);

  if (entry.endedAt === null) {
    return `${start} - Running`;
  }

  return `${start} - ${formatUtcTime(entry.endedAt)}`;
}

function toSharePercent(seconds: number, totalSeconds: number): number {
  if (seconds <= 0 || totalSeconds <= 0) {
    return 0;
  }

  return Math.max(1, Math.min(100, Math.round((seconds / totalSeconds) * 100)));
}

function toEntryLabel(count: number): string {
  return count === 1 ? "1 entry" : `${count} entries`;
}

function pickTopFocusItem(items: Iterable<FocusAccumulator>): FocusAccumulator | null {
  let winner: FocusAccumulator | null = null;

  for (const candidate of items) {
    if (
      winner === null ||
      candidate.seconds > winner.seconds ||
      (candidate.seconds === winner.seconds && candidate.entryCount > winner.entryCount) ||
      (
        candidate.seconds === winner.seconds &&
        candidate.entryCount === winner.entryCount &&
        candidate.title.localeCompare(winner.title) < 0
      )
    ) {
      winner = candidate;
    }
  }

  return winner;
}

export function useDashboardOverview(options: UseDashboardOverviewOptions = {}) {
  const authStore = options.authStore ?? useAuthStore();
  const client = options.client ?? defaultClient;
  const toast = options.toast ?? useToast();
  const appToast = createAppToast(toast);
  const now = options.now ?? (() => Date.now());
  const setIntervalFn = options.setIntervalFn ?? setInterval;
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval;

  const recentEntries = ref<TimeEntryResponse[]>([]);
  const weekEntries = ref<TimeEntryResponse[]>([]);
  const isLoadingOverview = shallowRef(true);
  const requestErrorMessage = shallowRef<string | null>(null);
  const nowMs = shallowRef(now());

  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let overviewRequestId = 0;
  let unsubscribeFromTimerSync: (() => void) | null = null;

  const pageState = computed<DashboardPageState>(() => {
    if (isLoadingOverview.value) {
      return "loading";
    }

    if (requestErrorMessage.value) {
      return "request-error";
    }

    if (recentEntries.value.length === 0) {
      return "empty";
    }

    return "ready";
  });

  const dashboardStats = computed<DashboardStat[]>(() => {
    const nowDate = new Date(nowMs.value);
    const todayStartMs = startOfUtcDay(nowDate).getTime();
    const tomorrowStartMs = addUtcDays(startOfUtcDay(nowDate), 1).getTime();
    const weekStartMs = startOfUtcIsoWeek(nowDate).getTime();
    const nextWeekStartMs = addUtcDays(startOfUtcIsoWeek(nowDate), 7).getTime();

    let todayTrackedSeconds = 0;
    let weekTrackedSeconds = 0;
    let weekEntryCount = 0;
    const todayProjectIds = new Set<string>();
    const weekProjectIds = new Set<string>();

    for (const entry of weekEntries.value) {
      const todaySeconds = getEntryTrackedSecondsWithinRange(
        entry,
        todayStartMs,
        tomorrowStartMs,
        nowMs.value,
      );
      const weekSeconds = getEntryTrackedSecondsWithinRange(
        entry,
        weekStartMs,
        nextWeekStartMs,
        nowMs.value,
      );

      if (todaySeconds > 0) {
        todayTrackedSeconds += todaySeconds;
        todayProjectIds.add(entry.project.id);
      }

      if (weekSeconds > 0) {
        weekTrackedSeconds += weekSeconds;
        weekEntryCount += 1;
        weekProjectIds.add(entry.project.id);
      }
    }

    return [
      {
        description:
          todayProjectIds.size === 1
            ? "1 project tracked today"
            : `${todayProjectIds.size} projects tracked today`,
        label: "Today",
        value: formatCompactDuration(todayTrackedSeconds),
      },
      {
        description: `${toEntryLabel(weekEntryCount)} tracked this week`,
        label: "This Week",
        value: formatCompactDuration(weekTrackedSeconds),
      },
      {
        description:
          weekProjectIds.size === 1
            ? "1 project received tracked time"
            : `${weekProjectIds.size} projects received tracked time`,
        label: "Projects This Week",
        value: String(weekProjectIds.size),
      },
    ];
  });

  const weeklyFocus = computed<DashboardWeeklyFocus>(() => {
    const nowDate = new Date(nowMs.value);
    const weekStartMs = startOfUtcIsoWeek(nowDate).getTime();
    const nextWeekStartMs = addUtcDays(startOfUtcIsoWeek(nowDate), 7).getTime();
    const projectMap = new Map<string, FocusAccumulator>();
    const taskMap = new Map<string, FocusAccumulator>();
    let totalTrackedSeconds = 0;

    for (const entry of weekEntries.value) {
      const trackedSeconds = getEntryTrackedSecondsWithinRange(
        entry,
        weekStartMs,
        nextWeekStartMs,
        nowMs.value,
      );

      if (trackedSeconds <= 0) {
        continue;
      }

      totalTrackedSeconds += trackedSeconds;

      const projectStats = projectMap.get(entry.project.id) ?? {
        entryCount: 0,
        label: "Top Project",
        seconds: 0,
        title: entry.project.name,
      };
      projectStats.entryCount += 1;
      projectStats.seconds += trackedSeconds;
      projectMap.set(entry.project.id, projectStats);

      const taskStats = taskMap.get(entry.task.id) ?? {
        descriptionLabel: entry.project.name,
        entryCount: 0,
        label: "Top Task",
        seconds: 0,
        title: entry.task.title,
      };
      taskStats.entryCount += 1;
      taskStats.seconds += trackedSeconds;
      taskMap.set(entry.task.id, taskStats);
    }

    const topProject = pickTopFocusItem(projectMap.values());
    const topTask = pickTopFocusItem(taskMap.values());

    return {
      project: topProject
        ? {
            description: `${formatCompactDuration(topProject.seconds)} tracked across ${toEntryLabel(topProject.entryCount)}`,
            entryCount: topProject.entryCount,
            label: topProject.label,
            shareLabel: `${toSharePercent(topProject.seconds, totalTrackedSeconds)}% of your tracked time this week`,
            sharePercent: toSharePercent(topProject.seconds, totalTrackedSeconds),
            title: topProject.title,
          }
        : null,
      task: topTask
        ? {
            description: `${topTask.descriptionLabel} • ${formatCompactDuration(topTask.seconds)} tracked`,
            entryCount: topTask.entryCount,
            label: topTask.label,
            shareLabel: `${toEntryLabel(topTask.entryCount)} contributed to this focus`,
            sharePercent: toSharePercent(topTask.seconds, totalTrackedSeconds),
            title: topTask.title,
          }
        : null,
    };
  });

  const recentEntryRows = computed<DashboardRecentEntryRow[]>(() => {
    return recentEntries.value.map((entry) => ({
      durationLabel: formatRecentEntryDuration(entry, nowMs.value),
      id: entry.id,
      isHighlighted: entry.endedAt === null,
      projectName: entry.project.name,
      taskTitle: entry.task.title,
      timeRangeLabel: formatRecentEntryTimeRange(entry),
    }));
  });

  function upsertEntries(
    currentEntries: TimeEntryResponse[],
    entry: TimeEntryResponse,
    limit?: number,
  ): TimeEntryResponse[] {
    const nextEntries = currentEntries
      .filter((candidate) => candidate.id !== entry.id)
      .concat(entry)
      .sort(compareTimeEntriesByRecency);

    return limit === undefined ? nextEntries : nextEntries.slice(0, limit);
  }

  function isEntryInCurrentWeek(entry: TimeEntryResponse): boolean {
    const nowDate = new Date(nowMs.value);
    const weekStartMs = startOfUtcIsoWeek(nowDate).getTime();
    const nextWeekStartMs = addUtcDays(startOfUtcIsoWeek(nowDate), 7).getTime();
    const startedAtMs = new Date(entry.startedAt).getTime();

    return startedAtMs >= weekStartMs && startedAtMs < nextWeekStartMs;
  }

  function reconcileTimerEvent(event: TimeEntryTimerSyncEvent): void {
    recentEntries.value = upsertEntries(recentEntries.value, event.entry, 10);

    if (event.type === "started") {
      if (isEntryInCurrentWeek(event.entry)) {
        weekEntries.value = upsertEntries(weekEntries.value, event.entry);
      }
    } else if (weekEntries.value.some((entry) => entry.id === event.entry.id)) {
      weekEntries.value = upsertEntries(weekEntries.value, event.entry);
    }

    nowMs.value = now();
  }

  function requireAccessToken(): string {
    if (!authStore.accessToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return authStore.accessToken;
  }

  async function loadWeekEntries(accessToken: string): Promise<TimeEntryResponse[]> {
    const nowDate = new Date(now());
    const weekStart = startOfUtcIsoWeek(nowDate).toISOString();
    const nextWeekStart = addUtcDays(startOfUtcIsoWeek(nowDate), 7).toISOString();
    const items: TimeEntryResponse[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await client.listOwnEntries(accessToken, {
        dateFrom: weekStart,
        dateTo: nextWeekStart,
        limit: 100,
        page: currentPage,
      });

      items.push(...response.items);
      totalPages = Math.max(response.meta.totalPages, 1);
      currentPage += 1;
    } while (currentPage <= totalPages);

    return items;
  }

  async function loadOverview(): Promise<void> {
    const accessToken = requireAccessToken();
    const requestId = ++overviewRequestId;

    isLoadingOverview.value = true;
    requestErrorMessage.value = null;

    try {
      const [recentResponse, nextWeekEntries] = await Promise.all([
        client.listOwnEntries(accessToken, { limit: 10, page: 1 }),
        loadWeekEntries(accessToken),
      ]);

      if (requestId !== overviewRequestId) {
        return;
      }

      recentEntries.value = recentResponse.items;
      weekEntries.value = nextWeekEntries;
    } catch (error) {
      if (requestId !== overviewRequestId) {
        return;
      }

      requestErrorMessage.value = getErrorMessage(error);
      appToast.showErrorToast({
        detail: "Refresh and try again.",
        error,
        logContext: { action: "load-overview", feature: "dashboard" },
        summary: "Could not load dashboard overview",
      });
    } finally {
      if (requestId === overviewRequestId) {
        isLoadingOverview.value = false;
      }
    }
  }

  async function retryLoadOverview(): Promise<void> {
    await loadOverview();
  }

  onMounted(() => {
    intervalHandle = setIntervalFn(() => {
      nowMs.value = now();
    }, 1000);

    unsubscribeFromTimerSync = subscribeToTimeEntryTimerSync((event) => {
      reconcileTimerEvent(event);
    });

    void loadOverview();
  });

  onBeforeUnmount(() => {
    unsubscribeFromTimerSync?.();
    unsubscribeFromTimerSync = null;

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
