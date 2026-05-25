<script setup lang="ts">
import Button from "primevue/button";

import { useTopBarTimer } from "@/composables/timer/useTopBarTimer";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";

const {
  closeDialog,
  confirmSelectedTask,
  createTaskErrorMessage,
  createTaskFromDialog,
  createTaskTitle,
  elapsedTimeLabel,
  handlePrimaryAction,
  isConfirmSelectionDisabled,
  isCreateTaskDisabled,
  isCreatingTask,
  isDialogOpen,
  isLoadingProjects,
  isLoadingSummary,
  isLoadingTasks,
  isPrimaryActionDisabled,
  isPrimaryActionPending,
  openDialog,
  primaryActionLabel,
  projectsErrorMessage,
  projectOptions,
  selectedProjectId,
  selectedTaskId,
  setCreateTaskTitle,
  setSelectedProjectId,
  setSelectedTaskId,
  summaryErrorMessage,
  taskOptions,
  tasksErrorMessage,
  timerContextLabel,
  timerStatusLabel,
} = useTopBarTimer();
</script>

<template>
  <section
    class="border-divider bg-app-bg flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5"
    data-testid="top-bar-timer"
  >
    <div class="min-w-0 flex-1">
      <p class="text-text-muted text-[11px] leading-none font-medium">
        {{ timerStatusLabel }}
      </p>
      <button
        type="button"
        class="text-text-dark mt-1 block max-w-full cursor-pointer truncate text-left text-[13px] font-medium"
        data-testid="top-bar-timer-context"
        @click="openDialog"
      >
        {{ timerContextLabel }}
      </button>
    </div>

    <p
      v-if="!isLoadingSummary && primaryActionLabel === 'Stop'"
      class="text-brand shrink-0 text-sm font-semibold tabular-nums"
    >
      {{ elapsedTimeLabel }}
    </p>

    <Button
      type="button"
      size="small"
      class="shrink-0"
      :disabled="isPrimaryActionDisabled"
      :label="primaryActionLabel"
      :loading="isPrimaryActionPending"
      :severity="primaryActionLabel === 'Stop' ? 'secondary' : undefined"
      @click="handlePrimaryAction"
    />
  </section>

  <TopBarTimerTaskDialog
    :create-task-error-message="createTaskErrorMessage"
    :create-task-title="createTaskTitle"
    :is-confirm-selection-disabled="isConfirmSelectionDisabled"
    :is-create-task-disabled="isCreateTaskDisabled"
    :is-creating-task="isCreatingTask"
    :is-loading-projects="isLoadingProjects"
    :is-loading-tasks="isLoadingTasks"
    :is-open="isDialogOpen"
    :project-options="projectOptions"
    :projects-error-message="projectsErrorMessage ?? summaryErrorMessage"
    :selected-project-id="selectedProjectId"
    :selected-task-id="selectedTaskId"
    :task-options="taskOptions"
    :tasks-error-message="tasksErrorMessage"
    @close="closeDialog"
    @confirm="confirmSelectedTask"
    @create-task="createTaskFromDialog"
    @update:create-task-title="setCreateTaskTitle"
    @update:selected-project-id="setSelectedProjectId"
    @update:selected-task-id="setSelectedTaskId"
  />
</template>
