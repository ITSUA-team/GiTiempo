<script setup lang="ts">
import { ChartBarSquareIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import Button from "primevue/button";
import { StatCard, SurfaceCard } from "@gitiempo/web-shared";
import { useRouter } from "vue-router";

import DashboardOverviewLoading from "@/components/dashboard/DashboardOverviewLoading.vue";
import DashboardRecentEntriesCard from "@/components/dashboard/DashboardRecentEntriesCard.vue";
import DashboardWeeklyFocusCard from "@/components/dashboard/DashboardWeeklyFocusCard.vue";
import PageHeader from "@/components/layout/PageHeader.vue";
import { useDashboardOverview } from "@/composables/useDashboardOverview";
import { routeNames } from "@/router";

const router = useRouter();

const {
  dashboardStats,
  pageState,
  recentEntryRows,
  requestErrorMessage,
  retryLoadOverview,
  weeklyFocus,
} = useDashboardOverview();

function openTimeEntries(): void {
  void router.push({ name: routeNames.timeEntries });
}
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <PageHeader
      subtitle="Track current work and review recent time activity. Timer actions stay in the global top bar."
      title="Dashboard"
    />

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
        <StatCard
          v-for="stat in dashboardStats"
          :key="stat.label"
          :description="stat.description"
          :label="stat.label"
          :value="stat.value"
        />
      </div>

      <DashboardWeeklyFocusCard :focus="weeklyFocus" />

      <DashboardRecentEntriesCard
        :entries="recentEntryRows"
        @view-all="openTimeEntries"
      />
    </div>
  </section>
</template>
