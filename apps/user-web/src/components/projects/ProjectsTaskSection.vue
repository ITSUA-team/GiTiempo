<script setup lang="ts">
import Column from "primevue/column";
import Tag from "primevue/tag";
import { PlusIcon } from "@heroicons/vue/24/outline";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import {
  EntryActionButton,
  ManagementTableEmptyState,
  ManagementTableShell,
  MobileRecordCard,
  managementTableColumnPt,
  managementTableHeaderClass,
  useIsMobileViewport,
  type ManagementTableColumn,
} from "@gitiempo/web-shared";

import TaskNameLink from "@/components/tasks/TaskNameLink.vue";
import TaskGitHubIssueLink from "@/components/tasks/TaskGitHubIssueLink.vue";
import TimerActionButton from "@/components/timer/TimerActionButton.vue";

interface ProjectsTaskSectionProps {
  activeTimerTaskId?: string | null;
  formatUpdatedLabel: (updatedAt: string) => string;
  isCurrentTimerLoading?: boolean;
  project: ProjectResponse;
  startingTimerTaskId?: string | null;
  stoppingTimerTaskId?: string | null;
  tasks: TaskResponse[];
}

const props = defineProps<ProjectsTaskSectionProps>();
const isMobileViewport = useIsMobileViewport();

const emit = defineEmits<{
  addTask: [projectId: string];
  editTask: [task: TaskResponse];
  openActiveTimer: [];
  startTimer: [task: TaskResponse];
  stopTimer: [task: TaskResponse];
}>();

const statusColumnWidth = "8.125rem";
const updatedColumnWidth = "10.625rem";

const columns = [
  { key: "task", label: "Task", width: "fill" },
  { key: "status", label: "Status", width: 130 },
  { key: "updated", label: "Updated", width: 170 },
] satisfies ManagementTableColumn[];

const projectTasksTableBodyRowClass =
  "border-divider h-[52px] border-b transition-colors last:border-b-0 hover:bg-app-bg";
const projectTasksTableHeaderClass = `${managementTableHeaderClass} min-w-[740px]`;

function formatTaskCount(count: number): string {
  return `${count} active task${count === 1 ? "" : "s"}`;
}

function getStatusLabel(task: TaskResponse): string {
  return task.status === "closed" ? "Closed" : "Open";
}

function getStatusPt(task: TaskResponse) {
  return {
    root:
      task.status === "closed"
        ? "bg-status-warn-bg text-status-warn-text rounded-sm px-2 py-1"
        : "rounded-sm bg-accent-tint px-2 py-1 text-brand",
    label: "text-xs font-semibold",
  };
}

function isTaskTimerRunning(task: TaskResponse): boolean {
  return props.activeTimerTaskId === task.id;
}

function isTimerOperationPending(): boolean {
  return (
    props.isCurrentTimerLoading === true ||
    props.startingTimerTaskId != null ||
    props.stoppingTimerTaskId != null
  );
}

function isStartTimerDisabled(): boolean {
  return isTimerOperationPending() || props.activeTimerTaskId != null;
}

function isTimerActionDisabled(task: TaskResponse): boolean {
  return isTaskTimerRunning(task)
    ? isTimerOperationPending()
    : isStartTimerDisabled();
}

function opensStopFirstGuidance(task: TaskResponse): boolean {
  return (
    !isTimerOperationPending() &&
    props.activeTimerTaskId != null &&
    !isTaskTimerRunning(task)
  );
}

function getTimerActionTarget(task: TaskResponse) {
  return {
    id: task.id,
    title: task.title,
  };
}

function handleTimerAction(task: TaskResponse): void {
  if (isTimerOperationPending()) {
    return;
  }

  if (isTaskTimerRunning(task)) {
    emit("stopTimer", task);
    return;
  }

  if (opensStopFirstGuidance(task)) {
    emit("openActiveTimer");
    return;
  }

  emit("startTimer", task);
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 class="text-text-dark truncate text-base font-semibold">
          {{ props.project.name }}
        </h2>
        <p class="text-text-muted text-xs">
          {{ formatTaskCount(props.tasks.length) }}
        </p>
      </div>

      <EntryActionButton
        data-testid="project-section-add-task"
        :icon="PlusIcon"
        label="Add task"
        @click="emit('addTask', props.project.id)"
      />
    </div>

    <div
      v-if="isMobileViewport"
      class="flex flex-col gap-3"
    >
      <MobileRecordCard
        v-for="task in props.tasks"
        :key="task.id"
        data-testid="project-task-mobile-card"
      >
        <div class="flex min-w-0 flex-col gap-2">
          <div
            class="flex min-w-0 items-center justify-between gap-3"
            data-testid="project-task-mobile-header"
          >
            <div class="flex max-w-full min-w-0 items-center gap-2">
              <TaskNameLink
                :label="task.title"
                :open-label="`Edit task ${task.title}`"
                test-id="project-task-mobile-title"
                @open="emit('editTask', task)"
              />
              <TaskGitHubIssueLink
                v-if="task.githubIssue"
                :issue="task.githubIssue"
                show-number
                :test-id="`project-task-mobile-github-${task.id}`"
              />
            </div>
            <TimerActionButton
              v-if="task.status !== 'closed'"
              :action="isTaskTimerRunning(task) ? 'stop' : 'start'"
              :disabled="isTimerActionDisabled(task)"
              :target="getTimerActionTarget(task)"
              :is-loading="props.startingTimerTaskId === task.id ||
                props.stoppingTimerTaskId === task.id"
              :show-stop-first-guidance="opensStopFirstGuidance(task)"
              test-id-prefix="project-task-mobile"
              @trigger="() => handleTimerAction(task)"
            />
          </div>

          <div class="flex items-center justify-between gap-3">
            <Tag
              :pt="getStatusPt(task)"
              :value="getStatusLabel(task)"
            />
            <span class="text-text-muted text-[13px]">
              {{ props.formatUpdatedLabel(task.updatedAt) }}
            </span>
          </div>
        </div>
      </MobileRecordCard>

      <ManagementTableEmptyState
        v-if="props.tasks.length === 0"
        description="Add a task to start tracking work for this project."
        title="No active tasks yet"
      />
    </div>

    <ManagementTableShell
      v-else
      :body-row-class="projectTasksTableBodyRowClass"
      :columns="columns"
      data-key="id"
      :header-class="projectTasksTableHeaderClass"
      :loading="false"
      :show-header="false"
      shell-class="border-divider overflow-x-auto rounded-lg border bg-surface-primary"
      single-scroll
      table-class="min-w-[740px] w-full table-fixed border-collapse"
      table-container-class="overflow-visible rounded-none border-none"
      :value="props.tasks"
    >
      <template #empty>
        <ManagementTableEmptyState
          description="Add a task to start tracking work for this project."
          title="No active tasks yet"
        />
      </template>

      <Column :pt="managementTableColumnPt">
        <template #body="slotProps">
          <div class="flex max-w-full min-w-0 items-center gap-2">
            <TimerActionButton
              v-if="slotProps.data.status !== 'closed'"
              :action="isTaskTimerRunning(slotProps.data) ? 'stop' : 'start'"
              :disabled="isTimerActionDisabled(slotProps.data)"
              :target="getTimerActionTarget(slotProps.data)"
              :is-loading="props.startingTimerTaskId === slotProps.data.id ||
                props.stoppingTimerTaskId === slotProps.data.id"
              :show-stop-first-guidance="opensStopFirstGuidance(slotProps.data)"
              test-id-prefix="project-task"
              @trigger="() => handleTimerAction(slotProps.data)"
            />
            <TaskNameLink
              :label="slotProps.data.title"
              :open-label="`Edit task ${slotProps.data.title}`"
              test-id="project-task-title"
              @open="emit('editTask', slotProps.data)"
            />
            <TaskGitHubIssueLink
              v-if="slotProps.data.githubIssue"
              :issue="slotProps.data.githubIssue"
              show-number
              :test-id="`project-task-github-${slotProps.data.id}`"
            />
          </div>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        :style="{ width: statusColumnWidth }"
      >
        <template #body="slotProps">
          <div>
            <Tag
              :pt="getStatusPt(slotProps.data)"
              :value="getStatusLabel(slotProps.data)"
            />
          </div>
        </template>
      </Column>

      <Column
        :pt="managementTableColumnPt"
        :style="{ width: updatedColumnWidth }"
      >
        <template #body="slotProps">
          <div class="text-text-muted text-[13px]">
            {{ props.formatUpdatedLabel(slotProps.data.updatedAt) }}
          </div>
        </template>
      </Column>
    </ManagementTableShell>
  </section>
</template>
