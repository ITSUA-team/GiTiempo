<script setup lang="ts">
import { ChartBarSquareIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import Button from "primevue/button";
import { StatCard, SurfaceCard } from "@gitiempo/web-shared";
import type { RouteLocationNamedRaw } from "vue-router";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import DashboardOverviewLoading from "@/components/dashboard/DashboardOverviewLoading.vue";
import DashboardRecentEntriesCard from "@/components/dashboard/DashboardRecentEntriesCard.vue";
import DashboardWeeklyFocusCard from "@/components/dashboard/DashboardWeeklyFocusCard.vue";
import { useDashboardOverview } from "@/composables/dashboard/useDashboardOverview";
import {
  parseFocusPeriodQuery,
  useDashboardCardNavigation,
} from "@/composables/dashboard/useDashboardCardNavigation";
import type { DashboardFocusPeriod } from "@/lib/dashboard-overview-helpers";
import { routeNames } from "@/constants/routes";

const route = useRoute();
const router = useRouter();

function navigate(routeLocation: RouteLocationNamedRaw): void {
  void router.push(routeLocation);
}

function replaceQueryFocusPeriod(focusPeriod: DashboardFocusPeriod): void {
  void router
    .replace({ query: { ...route.query, focusPeriod } })
    .catch(() => undefined);
}

const focusPeriod = ref<DashboardFocusPeriod>("week");
const nowMs = ref(Date.now());

let nowIntervalHandle: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  nowIntervalHandle = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  if (nowIntervalHandle) {
    clearInterval(nowIntervalHandle);
    nowIntervalHandle = null;
  }
});

const {
  dashboardStats,
  focusLoading,
  focusRequestErrorMessage,
  isDirectStartBlockedByCurrentTimer,
  pageState,
  recentEntryRows,
  requestErrorMessage,
  retryFocusLoad,
  retryLoadOverview,
  startingTimerEntryId,
  startTimerForEntry,
  stoppingTimerEntryId,
  stopTimerForEntry,
  weeklyFocus,
} = useDashboardOverview({ focusPeriod, now: () => nowMs.value });

const {
  focusRoute: focusSectionRoute,
  projectsThisWeekRoute,
  recentEntriesRoute,
  thisWeekRoute,
  todayRoute,
  topProjectRoute,
  topTaskRoute,
} = useDashboardCardNavigation({ focusPeriod, nowMs, weeklyFocus });

// Keyed by the stat labels produced by buildDashboardStats in
// dashboard-overview-helpers; if labels change there, update them here too.
const statCardRoutes = computed<Record<string, RouteLocationNamedRaw>>(() => ({
  "Projects This Week": projectsThisWeekRoute.value,
  "This Week": thisWeekRoute.value,
  Today: todayRoute.value,
}));

const statCardNavLabels: Record<string, string> = {
  "Projects This Week": "View time entries for projects tracked this week",
  "This Week": "View time entries for this week",
  Today: "View time entries for today",
};

watch(
  () => route.query.focusPeriod,
  (rawValue) => {
    const parsed = parseFocusPeriodQuery(rawValue);

    if (parsed) {
      focusPeriod.value = parsed;
      return;
    }

    focusPeriod.value = "week";
    replaceQueryFocusPeriod("week");
  },
  { immediate: true },
);

function handleFocusPeriodChange(next: DashboardFocusPeriod): void {
  if (focusPeriod.value === next) {
    return;
  }

  focusPeriod.value = next;
  replaceQueryFocusPeriod(next);
}

function openTimeEntries(): void {
  void router.push({ name: routeNames.timeEntries });
}
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <DashboardOverviewLoading v-if="pageState === 'loading'" />

    <SurfaceCard
      v-else-if="pageState === 'request-error'"
      body-class="flex min-h-64 flex-col items-center justify-center gap-4 text-center"
      data-testid="dashboard-request-error"
    >
      <div class="bg-accent-tint flex size-14 items-center justify-center rounded-full">
        <ExclamationTriangleIcon class="text-brand size-7" />
      </div>

      <div class="flex max-w-md flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          Could not load dashboard overview
        </h2>
        <p class="text-text-muted text-sm">
          {{ requestErrorMessage }}
        </p>
      </div>

      <Button
        label="Retry"
        severity="secondary"
        variant="outlined"
        @click="void retryLoadOverview()"
      />
    </SurfaceCard>

    <SurfaceCard
      v-else-if="pageState === 'empty'"
      body-class="flex min-h-64 flex-col items-center justify-center gap-4 text-center"
      data-testid="dashboard-empty-state"
    >
      <div class="bg-accent-tint flex size-14 items-center justify-center rounded-full">
        <ChartBarSquareIcon class="text-brand size-7" />
      </div>

      <div class="flex max-w-md flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          No recent time activity yet
        </h2>
        <p class="text-text-muted text-sm">
          Start a timer from the top bar or add an entry from Time Entries to populate your dashboard overview.
        </p>
      </div>

      <Button
        label="Open Time Entries"
        @click="openTimeEntries"
      />
    </SurfaceCard>

    <div
      v-else
      class="flex flex-col gap-6"
      data-testid="dashboard-ready-state"
    >
      <div
        class="grid gap-4 xl:grid-cols-3"
        data-testid="dashboard-stats-row"
      >
        <div
          v-for="stat in dashboardStats"
          :key="stat.label"
          class="group relative z-0 flex"
          data-testid="dashboard-stat-card"
        >
          <StatCard
            class="group-hover:shadow-popover transition-shadow"
            :description="stat.description"
            :label="stat.label"
            :value="stat.value"
          />
          <RouterLink
            :aria-label="statCardNavLabels[stat.label]"
            :to="statCardRoutes[stat.label]"
            class="focus-visible:ring-brand absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            data-testid="dashboard-stat-card-nav"
            @keydown.space.prevent="navigate(statCardRoutes[stat.label])"
          />
        </div>
      </div>

      <DashboardWeeklyFocusCard
        :error-message="focusRequestErrorMessage"
        :focus="weeklyFocus"
        :focus-period="focusPeriod"
        :loading="focusLoading"
        :project-route="topProjectRoute"
        :section-route="focusSectionRoute"
        :task-route="topTaskRoute"
        @activate-project="navigate(topProjectRoute)"
        @activate-section="navigate(focusSectionRoute)"
        @activate-task="navigate(topTaskRoute)"
        @retry="void retryFocusLoad()"
        @update:focus-period="handleFocusPeriodChange"
      />

      <DashboardRecentEntriesCard
        :entries="recentEntryRows"
        :is-start-timer-disabled="isDirectStartBlockedByCurrentTimer"
        :section-route="recentEntriesRoute"
        :starting-timer-entry-id="startingTimerEntryId"
        :stopping-timer-entry-id="stoppingTimerEntryId"
        @activate="navigate(recentEntriesRoute)"
        @start-timer="(entry) => void startTimerForEntry(entry)"
        @stop-timer="(entry) => void stopTimerForEntry(entry)"
        @view-all="openTimeEntries"
      />
    </div>
  </section>
</template>
