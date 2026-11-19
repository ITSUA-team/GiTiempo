<script setup lang="ts">
import Button from "primevue/button";
import ProgressBar from "primevue/progressbar";
import Select from "primevue/select";
import type { RouteLocationNamedRaw } from "vue-router";
import { InlineRequestMessage, SectionHeader, SurfaceCard } from "@gitiempo/web-shared";
import { computed } from "vue";

import DashboardFocusSkeleton from "./DashboardFocusSkeleton.vue";
import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import type { DashboardFocusPeriod, DashboardWeeklyFocus } from "@/lib/dashboard-overview-helpers";

const PERIOD_OPTIONS: { label: string; value: DashboardFocusPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

interface FocusPeriodCopy {
  description: string;
  navLabel: string;
  projectEmptyLabel: string;
  projectShareFallback: string;
  taskEmptyLabel: string;
  taskShareFallback: string;
  title: string;
}

const FOCUS_PERIOD_COPY: Record<DashboardFocusPeriod, FocusPeriodCopy> = {
  day: {
    description: "Your strongest project and task based on today's tracked entries.",
    navLabel: "View time entries for today",
    projectEmptyLabel: "No tracked project focus for today yet.",
    projectShareFallback: "Project share appears after your first current-day entry.",
    taskEmptyLabel: "No tracked task focus for today yet.",
    taskShareFallback: "Task repetition appears after your first current-day entry.",
    title: "Top Focus Today",
  },
  week: {
    description: "Your strongest project and task based on this week's tracked entries.",
    navLabel: "View time entries for this week",
    projectEmptyLabel: "No tracked project focus for this week yet.",
    projectShareFallback: "Project share appears after your first current-week entry.",
    taskEmptyLabel: "No tracked task focus for this week yet.",
    taskShareFallback: "Task repetition appears after your first current-week entry.",
    title: "Top Focus This Week",
  },
  month: {
    description: "Your strongest project and task based on this month's tracked entries.",
    navLabel: "View time entries for this month",
    projectEmptyLabel: "No tracked project focus for this month yet.",
    projectShareFallback: "Project share appears after your first current-month entry.",
    taskEmptyLabel: "No tracked task focus for this month yet.",
    taskShareFallback: "Task repetition appears after your first current-month entry.",
    title: "Top Focus This Month",
  },
};

const cardNavLinkClass =
  "absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset";

const props = withDefaults(
  defineProps<{
    errorMessage?: string | null;
    focus: DashboardWeeklyFocus;
    focusPeriod?: DashboardFocusPeriod;
    loading?: boolean;
    projectRoute?: RouteLocationNamedRaw | null;
    sectionRoute?: RouteLocationNamedRaw | null;
    taskRoute?: RouteLocationNamedRaw | null;
  }>(),
  {
    errorMessage: null,
    focusPeriod: "week",
    loading: false,
    projectRoute: null,
    sectionRoute: null,
    taskRoute: null,
  },
);

const emit = defineEmits<{
  activateProject: [];
  activateSection: [];
  activateTask: [];
  retry: [];
  "update:focusPeriod": [DashboardFocusPeriod];
}>();

const copy = computed(() => FOCUS_PERIOD_COPY[props.focusPeriod]);
const selectedFocusPeriod = computed({
  get: () => props.focusPeriod,
  set: (next) => emit("update:focusPeriod", next),
});
const projectNavLinkLabel = computed(() =>
  props.focus.project
    ? `View time entries for project ${props.focus.project.title}`
    : copy.value.navLabel,
);
const sectionNavLinkLabel = computed(() => copy.value.navLabel);
const taskNavLinkLabel = computed(() =>
  props.focus.task
    ? `View time entries for task ${props.focus.task.title}`
    : copy.value.navLabel,
);
</script>

<template>
  <div class="group relative z-0">
    <SurfaceCard
      body-class="relative flex flex-col gap-4"
      class="group-hover:shadow-popover transition-shadow"
      padding-class="p-6"
    >
      <SectionHeader
        :description="copy.description"
        :title="copy.title"
      >
        <template #actions>
          <span
            class="relative z-30"
            data-testid="dashboard-focus-period-control"
            @click.stop
          >
            <Select
              v-model="selectedFocusPeriod"
              :options="PERIOD_OPTIONS"
              aria-label="Top Focus period"
              data-testid="focus-period-select"
              option-label="label"
              option-value="value"
            />
          </span>
        </template>
      </SectionHeader>

      <div
        v-if="props.loading"
        data-testid="dashboard-focus-loading-state"
      >
        <DashboardFocusSkeleton />
      </div>

      <div
        v-else-if="props.errorMessage"
        class="bg-app-bg flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center"
        data-testid="dashboard-focus-error-state"
      >
        <InlineRequestMessage
          title="Could not load top focus"
          :message="props.errorMessage"
        />
        <span
          class="relative z-30"
          @click.stop
        >
          <Button
            aria-label="Retry loading top focus"
            data-testid="dashboard-focus-retry"
            label="Retry"
            severity="secondary"
            variant="outlined"
            @click="emit('retry')"
          />
        </span>
      </div>

      <div
        v-else
        class="grid min-w-0 gap-4 xl:grid-cols-2"
      >
        <div class="bg-app-bg relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg p-4">
          <p class="text-text-muted text-xs font-semibold tracking-wide uppercase">
            Top Project
          </p>
          <p class="text-text-dark text-xl font-semibold break-words sm:text-2xl">
            {{ props.focus.project?.title ?? 'No tracked project yet' }}
          </p>
          <p class="text-text-muted text-[13px] break-words">
            {{ props.focus.project?.description ?? copy.projectEmptyLabel }}
          </p>
          <ProgressBar
            :show-value="false"
            :value="props.focus.project?.sharePercent ?? 0"
            :pt="{
              root: 'bg-divider h-2 overflow-hidden rounded-full',
              value: 'bg-brand rounded-full',
            }"
          />
          <p class="text-text-muted text-xs break-words">
            {{ props.focus.project?.shareLabel ?? copy.projectShareFallback }}
          </p>
          <RouterLink
            v-if="props.projectRoute"
            :aria-label="projectNavLinkLabel"
            :class="cardNavLinkClass + ' z-20'"
            :to="props.projectRoute"
            data-testid="dashboard-focus-project-nav"
            @keydown.space.prevent="emit('activateProject')"
          />
        </div>

        <div class="bg-app-bg relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg p-4">
          <p class="text-text-muted text-xs font-semibold tracking-wide uppercase">
            Top Task
          </p>
          <div class="flex max-w-full min-w-0 items-start gap-1.5">
            <p class="text-text-dark min-w-0 text-xl font-semibold break-words sm:text-2xl">
              {{ props.focus.task?.title ?? 'No tracked task yet' }}
            </p>
            <span
              v-if="props.focus.task?.githubIssue"
              class="relative z-30 shrink-0"
              @click.stop
            >
              <TaskGitHubIssueLink
                :issue="props.focus.task.githubIssue"
                test-id="dashboard-weekly-focus-task-github"
              />
            </span>
          </div>
          <p class="text-text-muted text-[13px] break-words">
            {{ props.focus.task?.description ?? copy.taskEmptyLabel }}
          </p>
          <ProgressBar
            :show-value="false"
            :value="props.focus.task?.sharePercent ?? 0"
            :pt="{
              root: 'bg-divider h-2 overflow-hidden rounded-full',
              value: 'bg-brand rounded-full',
            }"
          />
          <p class="text-text-muted text-xs break-words">
            {{ props.focus.task?.shareLabel ?? copy.taskShareFallback }}
          </p>
          <RouterLink
            v-if="props.taskRoute"
            :aria-label="taskNavLinkLabel"
            :class="cardNavLinkClass + ' z-20'"
            :to="props.taskRoute"
            data-testid="dashboard-focus-task-nav"
            @keydown.space.prevent="emit('activateTask')"
          />
        </div>
      </div>
    </SurfaceCard>

    <RouterLink
      v-if="props.sectionRoute"
      :aria-label="sectionNavLinkLabel"
      :class="cardNavLinkClass + ' z-10'"
      :to="props.sectionRoute"
      data-testid="dashboard-focus-section-nav"
      @keydown.space.prevent="emit('activateSection')"
    />
  </div>
</template>
