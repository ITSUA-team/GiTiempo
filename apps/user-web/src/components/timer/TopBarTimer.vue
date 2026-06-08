<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import { useIsMobileViewport } from "@gitiempo/web-shared";

import { useTopBarTimer } from "@/composables/timer/useTopBarTimer";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";

const {
  closeDialog,
  confirmSelectedTask,
  createTaskErrorMessage,
  createTaskTitle,
  elapsedTimeLabel,
  handleDialogPrimaryAction,
  isConfirmingSelection,
  isConfirmSelectionDisabled,
  isCreateTaskDisabled,
  isCreatingTask,
  isDialogPrimaryActionDisabled,
  isDialogOpen,
  isLoadingProjects,
  isLoadingSummary,
  isLoadingTasks,
  isPrimaryActionPending,
  isTimerRunning,
  openDialog,
  primaryActionLabel,
  projectsErrorMessage,
  projectOptions,
  selectedDescription,
  selectedProjectId,
  selectedTaskId,
  selectionUpdateErrorMessage,
  setCreateTaskTitle,
  setSelectedDescription,
  setSelectedProjectId,
  setSelectedTaskId,
  summaryErrorMessage,
  taskOptions,
  tasksErrorMessage,
  timerActionErrorMessage,
  timerProjectLabel,
  timerTaskLabel,
} = useTopBarTimer();

const isMobileViewport = useIsMobileViewport();
const showsElapsedTime = computed(
  () => !isLoadingSummary.value && isTimerRunning.value,
);
</script>

<template>
  <Button
    v-if="!isMobileViewport"
    unstyled
    type="button"
    aria-label="Open task and timer"
    class="ring-divider bg-app-bg text-text-dark hover:bg-app-bg focus-visible:outline-brand flex h-[47px] max-w-[min(360px,100%)] min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left ring-1 transition ring-inset focus-visible:outline-2 focus-visible:outline-offset-2"
    data-layout="desktop"
    data-testid="top-bar-timer"
    @click="openDialog"
  >
    <span
      class="flex min-w-0 flex-col gap-0.5"
      data-testid="top-bar-timer-context"
    >
      <span class="text-text-muted truncate text-[11px] leading-[13px] font-medium">
        {{ timerProjectLabel }}
      </span>
      <span class="text-text-dark truncate text-[13px] leading-4 font-semibold">
        {{ timerTaskLabel }}
      </span>
    </span>

    <span
      v-if="showsElapsedTime"
      aria-live="off"
      class="text-brand shrink-0 text-sm font-semibold tabular-nums"
      data-testid="top-bar-timer-elapsed"
    >
      {{ elapsedTimeLabel }}
    </span>
  </Button>

  <section
    v-else
    class="border-divider bg-surface-primary flex w-full min-w-0 items-center gap-3 border-t px-4 py-3"
    data-layout="mobile"
    data-testid="top-bar-timer"
  >
    <Button
      unstyled
      type="button"
      class="ring-divider bg-surface-primary text-brand focus-visible:outline-brand hover:bg-app-bg z-10 flex h-[38px] w-[132px] shrink-0 items-center justify-center gap-[5px] rounded-sm px-2.5 text-xs leading-[14px] font-semibold ring-1 transition ring-inset focus-visible:outline-2 focus-visible:outline-offset-2"
      data-testid="top-bar-timer-mobile-opener"
      @click="openDialog"
    >
      <svg
        aria-hidden="true"
        class="size-[13px] shrink-0"
        data-testid="top-bar-timer-mobile-opener-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
      >
        <path d="m18 14 4 4-4 4" />
        <path d="m18 2 4 4-4 4" />
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6C13.5 6.6 14.7 6 16.1 6H22" />
        <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
        <path d="M22 18h-5.9c-1.5 0-2.9-.9-3.6-2.2l-.6-.8" />
      </svg>
      <span>Task &amp; timer</span>
    </Button>

    <div
      class="flex min-w-0 flex-1 flex-col items-start justify-start gap-0 text-left"
      data-testid="top-bar-timer-mobile-context"
    >
      <span class="text-text-muted flex w-full min-w-0 items-center gap-2 text-[11px] leading-none font-medium">
        <span class="truncate">{{ timerProjectLabel }}</span>
        <span
          v-if="showsElapsedTime"
          aria-hidden="true"
          aria-live="off"
          class="text-brand shrink-0 tabular-nums"
          data-testid="top-bar-timer-elapsed"
        >
          {{ elapsedTimeLabel }}
        </span>
      </span>
      <span class="text-text-dark mt-1 line-clamp-2 w-full text-[13px] leading-snug font-semibold whitespace-normal">
        {{ timerTaskLabel }}
      </span>
    </div>
  </section>

  <TopBarTimerTaskDialog
    :create-task-error-message="createTaskErrorMessage"
    :create-task-title="createTaskTitle"
    :is-confirm-selection-disabled="isConfirmSelectionDisabled"
    :is-confirming-selection="isConfirmingSelection"
    :is-create-task-disabled="isCreateTaskDisabled"
    :is-creating-task="isCreatingTask"
    :is-primary-action-disabled="isDialogPrimaryActionDisabled"
    :is-primary-action-pending="isPrimaryActionPending"
    :is-loading-projects="isLoadingProjects"
    :is-loading-tasks="isLoadingTasks"
    :is-open="isDialogOpen"
    :primary-action-label="primaryActionLabel"
    :project-options="projectOptions"
    :projects-error-message="projectsErrorMessage ?? summaryErrorMessage"
    :selected-description="selectedDescription"
    :selected-project-id="selectedProjectId"
    :selected-task-id="selectedTaskId"
    :selection-update-error-message="selectionUpdateErrorMessage"
    :task-options="taskOptions"
    :timer-action-error-message="timerActionErrorMessage"
    :tasks-error-message="tasksErrorMessage"
    @close="closeDialog"
    @confirm="confirmSelectedTask"
    @primary-action="handleDialogPrimaryAction"
    @update:create-task-title="setCreateTaskTitle"
    @update:selected-description="setSelectedDescription"
    @update:selected-project-id="setSelectedProjectId"
    @update:selected-task-id="setSelectedTaskId"
  />
</template>
