<script setup lang="ts">
import { ChartBarSquareIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import type { ProjectResponse, TimeEntryResponse } from "@gitiempo/shared";
import Button from "primevue/button";
import { getErrorMessage, StatCard, SurfaceCard } from "@gitiempo/web-shared";
import { computed, nextTick, ref, watch } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { useRouter } from "vue-router";

import DashboardOverviewLoading from "@/components/dashboard/DashboardOverviewLoading.vue";
import DashboardRecentEntriesCard from "@/components/dashboard/DashboardRecentEntriesCard.vue";
import DashboardWeeklyFocusCard from "@/components/dashboard/DashboardWeeklyFocusCard.vue";
import TimeEntryDialogConnection from "@/components/time-entries/TimeEntryDialogConnection.vue";
import { useDashboardOverview } from "@/composables/dashboard/useDashboardOverview";
import { useVisibleProjectsQuery } from "@/composables/query";
import { useTimeEntryDialog } from "@/composables/time-entries/useTimeEntryDialog";
import { useTimeEntryDialogWorkflow } from "@/composables/time-entries/useTimeEntryDialogWorkflow";
import { useTimeEntryMutations } from "@/composables/time-entries/useTimeEntryMutations";
import { useTimeEntryTaskOptions } from "@/composables/time-entries/useTimeEntryTaskOptions";
import { useTopBarTimerDialogController } from "@/composables/timer/useTopBarTimerDialogController";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { userProjectsKeys } from "@/lib/query-keys";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const client = createDefaultTimeEntriesClient();
const confirm = useConfirm();
const toast = useToast();
const topBarTimerDialogController = useTopBarTimerDialogController();
const scope = computed(() => getUserServerStateScope(authStore.accessToken));
const hasAccessToken = computed(() => Boolean(authStore.accessToken));
const visibleProjectsQuery = useVisibleProjectsQuery({
  client,
  enabled: hasAccessToken,
  queryKey: computed(() => userProjectsKeys.visibleProjects(scope.value)),
  scope,
});
const visibleProjects = computed(() => visibleProjectsQuery.data.value ?? []);
const activeProjects = computed(() => visibleProjects.value.filter((project) => project.isActive));
const isLoadingProjects = computed(() => visibleProjectsQuery.isPending.value);
const projectsErrorMessage = computed(() =>
  visibleProjectsQuery.error.value
    ? getErrorMessage(visibleProjectsQuery.error.value)
    : null,
);

async function ensureProjectsLoaded(force = false): Promise<ProjectResponse[]> {
  if (!force && visibleProjects.value.length > 0) {
    return visibleProjects.value;
  }

  const result = await visibleProjectsQuery.refetch({
    cancelRefetch: false,
    throwOnError: true,
  });

  if (!result.data) {
    throw result.error ?? new Error("Could not load visible projects.");
  }

  return result.data;
}

const dialog = useTimeEntryDialog();
const mutations = useTimeEntryMutations({
  client,
  scope,
  toast,
});
const taskOptions = useTimeEntryTaskOptions({
  client,
  getProjectById(projectId) {
    return visibleProjects.value.find((project) => project.id === projectId) ?? null;
  },
  scope,
});
const dialogWorkflow = useTimeEntryDialogWorkflow({
  client,
  confirm,
  dialog,
  ensureProjectsLoaded,
  mutations,
  scope,
  taskOptions,
  toast,
  visibleProjects: activeProjects,
});

const { isDialogOpen } = dialog;
const {
  openEditDialog: openEditDialogWorkflow,
  requestDeleteDialogEntry: requestDeleteDialogEntryWorkflow,
} = dialogWorkflow;
const { requestOpen: openActiveTimer } = topBarTimerDialogController;
const {
  dashboardStats,
  hasConfirmedActiveTimer,
  isDirectStartBlockedByCurrentTimer,
  pageState,
  recentEntryRows,
  requestErrorMessage,
  retryLoadOverview,
  startingTimerEntryId,
  startTimerForEntry,
  stoppingTimerEntryId,
  stopTimerForEntry,
  verifyActiveTimerEntry,
  weeklyFocus,
} = useDashboardOverview();

function openTimeEntries(): void {
  void router.push({ name: routeNames.timeEntries });
}

async function handleOpenActiveTimer(entryId: string): Promise<void> {
  const isStillActive = await verifyActiveTimerEntry(entryId);
  if (isStillActive) {
    openActiveTimer();
  }
}

function openEditDialog(entry: TimeEntryResponse): void {
  openEditDialogWorkflow(entry);
}

const recentEntriesCardRef = ref<InstanceType<typeof DashboardRecentEntriesCard> | null>(null);
const openTimeEntriesButtonRef = ref<{ $el?: HTMLElement } | null>(null);
const deletedEntryId = ref<string | null>(null);

function requestDeleteDialogEntry(): void {
  deletedEntryId.value = dialog.editingEntry.value?.id ?? null;
  requestDeleteDialogEntryWorkflow();
}

watch(isDialogOpen, (open) => {
  if (open || !deletedEntryId.value) {
    return;
  }

  const wasDeleted = !recentEntryRows.value.some(
    (row) => row.id === deletedEntryId.value,
  );
  deletedEntryId.value = null;

  if (!wasDeleted) {
    return;
  }

  void nextTick(() => {
    if (pageState.value === "empty") {
      const el = openTimeEntriesButtonRef.value?.$el;
      el?.focus();
    } else {
      recentEntriesCardRef.value?.focusViewAll();
    }
  });
});
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
        ref="openTimeEntriesButtonRef"
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
        ref="recentEntriesCardRef"
        :entries="recentEntryRows"
        :is-start-timer-disabled="isDirectStartBlockedByCurrentTimer"
        :show-stop-first-guidance="hasConfirmedActiveTimer"
        :starting-timer-entry-id="startingTimerEntryId"
        :stopping-timer-entry-id="stoppingTimerEntryId"
        @edit-entry="(entry) => openEditDialog(entry)"
        @open-active-timer="(entryId) => void handleOpenActiveTimer(entryId)"
        @go-to-active-timer="openActiveTimer"
        @start-timer="(entry) => void startTimerForEntry(entry)"
        @stop-timer="(entry) => void stopTimerForEntry(entry)"
        @view-all="openTimeEntries"
      />
    </div>

    <TimeEntryDialogConnection
      :dialog="dialog"
      :workflow="dialogWorkflow"
      :is-loading-projects="isLoadingProjects"
      :projects="activeProjects"
      :projects-error-message="projectsErrorMessage"
      @delete-entry="requestDeleteDialogEntry"
    />
  </section>
</template>
