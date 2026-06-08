<script setup lang="ts">
import { computed } from "vue";
import { useIsMobileViewport } from "@gitiempo/web-shared";

import { useTopBarTimer } from "@/composables/timer/useTopBarTimer";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";

const {
  closeDialog,
  confirmSelectedTask,
  createTaskErrorMessage,
  createTaskFromDialog,
  createTaskTitle,
  currentTimer,
  elapsedTimeLabel,
  isConfirmingSelection,
  isCreateTaskDisabled,
  isCreatingTask,
  isDialogOpen,
  isDialogPrimaryActionDisabled,
  isDialogSecondaryActionDisabled,
  isLoadingProjects,
  isLoadingSummary,
  isLoadingTasks,
  isPrimaryActionPending,
  isTimerRunning,
  openDialog,
  primaryActionLabel,
  projectsErrorMessage,
  projectOptions,
  selectedContext,
  selectedDescription,
  selectedProjectId,
  selectedTaskId,
  selectionUpdateErrorMessage,
  setCreateTaskTitle,
  setSelectedDescription,
  setSelectedProjectId,
  setSelectedTaskId,
  startTimerFromDialog,
  stopTimerFromDialog,
  summaryErrorMessage,
  taskOptions,
  tasksErrorMessage,
  timerActionErrorMessage,
} = useTopBarTimer();

const isMobileViewport = useIsMobileViewport();
const showsElapsedTime = computed(
  () => !isLoadingSummary.value && isTimerRunning.value,
);
const surfacePrimaryLabel = computed(() => {
  if (currentTimer.value) {
    return currentTimer.value.project.name;
  }

  if (isLoadingSummary.value) {
    return "Loading timer";
  }

  if (summaryErrorMessage.value) {
    return "Timer unavailable";
  }

  if (selectedContext.value) {
    return selectedContext.value.projectName;
  }

  return "No eligible task";
});
const surfaceSecondaryLabel = computed(() => {
  if (currentTimer.value) {
    return currentTimer.value.task.title;
  }

  if (summaryErrorMessage.value || isLoadingSummary.value) {
    return "Open the popup to choose a task.";
  }

  if (selectedContext.value) {
    return selectedContext.value.taskTitle;
  }

  return "Choose a visible project and task to start tracking time.";
});
</script>

<template>
  <section
    v-if="!isMobileViewport"
    class="flex min-w-0"
    data-layout="desktop"
    data-testid="top-bar-timer"
  >
    <button
      type="button"
      aria-label="Open timer"
      class="border-divider bg-app-bg hover:bg-surface-primary focus-visible:outline-brand flex max-w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg border px-3 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2"
      data-testid="top-bar-timer-surface"
      @click="openDialog"
    >
      <div class="min-w-0">
        <p class="text-text-muted truncate text-[11px] leading-none font-medium">
          {{ surfacePrimaryLabel }}
        </p>
        <p class="text-text-dark mt-1 truncate text-[13px] leading-none font-semibold">
          {{ surfaceSecondaryLabel }}
        </p>
      </div>

      <p
        v-if="showsElapsedTime"
        aria-live="off"
        class="text-brand shrink-0 text-xl font-semibold tabular-nums"
        data-testid="top-bar-timer-elapsed"
      >
        {{ elapsedTimeLabel }}
      </p>
    </button>
  </section>

  <section
    v-else
    class="border-divider bg-surface-primary flex w-full min-w-0 items-center gap-3 border-t px-4 py-3"
    data-layout="mobile"
    data-testid="top-bar-timer"
  >
    <button
      type="button"
      aria-label="Task and timer"
      class="border-divider text-brand bg-surface-primary focus-visible:outline-brand z-10 h-[38px] w-[132px] shrink-0 rounded-sm border px-3 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
      data-testid="top-bar-timer-mobile-opener"
      @click="openDialog"
    >
      Task &amp; timer
    </button>

    <div
      class="flex min-w-0 flex-1 flex-col items-start justify-start gap-0 text-left"
      data-testid="top-bar-timer-mobile-metadata"
    >
      <span class="text-text-muted block w-full truncate text-[11px] leading-none font-medium">
        {{ surfacePrimaryLabel }}
      </span>
      <span class="mt-1 flex w-full min-w-0 items-center gap-2">
        <span class="text-text-dark block min-w-0 flex-1 truncate text-[13px] leading-snug font-semibold">
          {{ surfaceSecondaryLabel }}
        </span>
        <span
          v-if="showsElapsedTime"
          aria-hidden="true"
          aria-live="off"
          class="text-brand shrink-0 text-[11px] font-semibold tabular-nums"
          data-testid="top-bar-timer-elapsed"
        >
          {{ elapsedTimeLabel }}
        </span>
      </span>
    </div>
  </section>

  <TopBarTimerTaskDialog
    :create-task-error-message="createTaskErrorMessage"
    :create-task-title="createTaskTitle"
    :is-confirm-selection-disabled="isDialogSecondaryActionDisabled"
    :is-confirming-selection="isConfirmingSelection"
    :is-create-task-disabled="isCreateTaskDisabled"
    :is-creating-task="isCreatingTask"
    :is-loading-projects="isLoadingProjects"
    :is-loading-tasks="isLoadingTasks"
    :is-open="isDialogOpen"
    :is-primary-action-disabled="isDialogPrimaryActionDisabled"
    :is-primary-action-pending="isPrimaryActionPending"
    :is-timer-running="isTimerRunning"
    :primary-action-label="primaryActionLabel === 'Stop' ? 'Stop timer' : 'Start timer'"
    :project-options="projectOptions"
    :projects-error-message="projectsErrorMessage ?? summaryErrorMessage"
    :selected-description="selectedDescription"
    :selected-project-id="selectedProjectId"
    :selected-task-id="selectedTaskId"
    :selection-update-error-message="selectionUpdateErrorMessage"
    :task-options="taskOptions"
    :tasks-error-message="tasksErrorMessage"
    :timer-action-error-message="timerActionErrorMessage"
    @close="closeDialog"
    @confirm="confirmSelectedTask"
    @create-task="createTaskFromDialog"
    @primary-action="isTimerRunning ? stopTimerFromDialog() : startTimerFromDialog()"
    @update:create-task-title="setCreateTaskTitle"
    @update:selected-description="setSelectedDescription"
    @update:selected-project-id="setSelectedProjectId"
    @update:selected-task-id="setSelectedTaskId"
  />
</template>
