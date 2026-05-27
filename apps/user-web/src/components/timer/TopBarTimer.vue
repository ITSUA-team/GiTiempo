<script setup lang="ts">
import {
  ArrowsRightLeftIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/vue/24/outline";
import { computed } from "vue";
import Button from "primevue/button";
import { useIsMobileViewport } from "@gitiempo/web-shared";

import { useTopBarTimer } from "@/composables/useTopBarTimer";

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

const isMobileViewport = useIsMobileViewport();
const showsElapsedTime = computed(
  () => !isLoadingSummary.value && primaryActionLabel.value === "Stop",
);
const primaryActionIcon = computed(() =>
  primaryActionLabel.value === "Stop" ? StopIcon : PlayIcon,
);
</script>

<template>
  <section
    v-if="!isMobileViewport"
    class="border-divider bg-app-bg flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5"
    data-layout="desktop"
    data-testid="top-bar-timer"
  >
    <div class="min-w-0 flex-1">
      <p class="text-text-muted text-[11px] leading-none font-medium">
        {{ timerStatusLabel }}
      </p>
      <button
        type="button"
        aria-label="Change timer task"
        class="text-text-dark mt-1 block max-w-full cursor-pointer truncate text-left text-[13px] font-medium"
        data-testid="top-bar-timer-context"
        @click="openDialog"
      >
        {{ timerContextLabel }}
      </button>
    </div>

    <p
      v-if="showsElapsedTime"
      aria-live="off"
      class="text-brand shrink-0 text-sm font-semibold tabular-nums"
      data-testid="top-bar-timer-elapsed"
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
      data-testid="top-bar-timer-primary-action"
      @click="handlePrimaryAction"
    />
  </section>

  <section
    v-else
    class="border-divider bg-surface flex w-full min-w-0 items-center gap-3 border-t px-4 py-3"
    data-layout="mobile"
    data-testid="top-bar-timer"
  >
    <div
      class="z-10 flex w-[132px] shrink-0 flex-col gap-[7px]"
      data-testid="top-bar-timer-mobile-actions"
    >
      <Button
        type="button"
        class="h-[38px] w-full justify-center rounded-sm text-xs font-semibold"
        :aria-label="primaryActionLabel"
        :disabled="isPrimaryActionDisabled"
        :loading="isPrimaryActionPending"
        :severity="primaryActionLabel === 'Stop' ? 'secondary' : undefined"
        data-testid="top-bar-timer-primary-action"
        @click="handlePrimaryAction"
      >
        <component
          :is="primaryActionIcon"
          v-if="!isPrimaryActionPending"
          aria-hidden="true"
          class="size-3.5"
        />
        <span>{{ primaryActionLabel }}</span>
      </Button>

      <Button
        type="button"
        class="h-[38px] w-full justify-center rounded-sm text-xs font-semibold"
        aria-label="Change timer task"
        severity="secondary"
        variant="outlined"
        data-testid="top-bar-timer-change-task"
        @click="openDialog"
      >
        <ArrowsRightLeftIcon
          aria-hidden="true"
          class="size-3.5"
        />
        <span>Change</span>
      </Button>
    </div>

    <button
      type="button"
      aria-label="Change timer task"
      class="min-w-0 flex-1 text-left"
      data-testid="top-bar-timer-mobile-context"
      @click="openDialog"
    >
      <span class="text-text-muted flex items-center gap-2 text-[11px] leading-none font-medium">
        <span class="truncate">{{ timerStatusLabel }}</span>
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
      <span class="text-text-dark mt-1 block truncate text-[13px] font-semibold">
        {{ timerContextLabel }}
      </span>
    </button>
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
