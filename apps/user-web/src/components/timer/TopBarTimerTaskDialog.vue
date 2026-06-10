<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import ProgressSpinner from "primevue/progressspinner";
import Textarea from "primevue/textarea";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { useIsMobileViewport } from "@gitiempo/web-shared";
import { computed, ref } from "vue";

const props = defineProps<{
  createTaskErrorMessage: string | null;
  createTaskTitle: string;
  isConfirmSelectionDisabled: boolean;
  isConfirmingSelection: boolean;
  isCreateTaskDisabled: boolean;
  isCreatingTask: boolean;
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isOpen: boolean;
  isPrimaryActionDisabled: boolean;
  isPrimaryActionPending: boolean;
  isTimerRunning: boolean;
  primaryActionLabel: string;
  projectOptions: ProjectResponse[];
  projectsErrorMessage: string | null;
  selectedDescription: string;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  selectionUpdateErrorMessage: string | null;
  taskOptions: TaskResponse[];
  tasksErrorMessage: string | null;
  timerActionErrorMessage: string | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
  createTask: [];
  "primary-action": [];
  "update:createTaskTitle": [value: string];
  "update:selectedDescription": [value: string];
  "update:selectedProjectId": [value: string | null];
  "update:selectedTaskId": [value: string | null];
}>();

const projectSuggestions = ref<ProjectResponse[]>([]);
const taskSuggestions = ref<TaskResponse[]>([]);
const selectedProjectModel = computed(
  () =>
    props.projectOptions.find((project) => project.id === props.selectedProjectId) ??
    null,
);

const selectedTaskModel = computed(
  () => props.taskOptions.find((task) => task.id === props.selectedTaskId) ?? null,
);

const selectedDescriptionModel = computed({
  get: () => props.selectedDescription,
  set: (value: string) => {
    emit("update:selectedDescription", value);
  },
});

const createTaskTitleModel = computed({
  get: () => props.createTaskTitle,
  set: (value: string) => {
    emit("update:createTaskTitle", value);
  },
});

const isMobileViewport = useIsMobileViewport();
const taskSelectOverlayClass = "max-w-[calc(100vw-2rem)]";
const taskAutoCompletePt = {
  listContainer: { class: "max-w-full" },
  option: { class: "min-w-0" },
  pcInputText: { root: { class: "truncate" } },
  root: { class: "max-w-full min-w-0" },
} as const;

function handleProjectComplete(event: { query: string }): void {
  const normalizedQuery = event.query.trim().toLowerCase();

  projectSuggestions.value = normalizedQuery
    ? props.projectOptions.filter((project) =>
        project.name.toLowerCase().includes(normalizedQuery),
      )
    : [...props.projectOptions];
}

function handleProjectUpdate(value: ProjectResponse | string | null): void {
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      emit("update:selectedProjectId", null);
    }

    return;
  }

  emit("update:selectedProjectId", value?.id ?? null);
}

function handleTaskComplete(event: { query: string }): void {
  const normalizedQuery = event.query.trim().toLowerCase();

  taskSuggestions.value = normalizedQuery
    ? props.taskOptions.filter((task) =>
        task.title.toLowerCase().includes(normalizedQuery),
      )
    : [...props.taskOptions];
}

function handleTaskUpdate(value: TaskResponse | string | null): void {
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      emit("update:selectedTaskId", null);
    }

    return;
  }

  emit("update:selectedTaskId", value?.id ?? null);
}
</script>

<template>
  <Dialog
    modal
    block-scroll
    :dismissable-mask="true"
    :draggable="false"
    :pt="{
      root: 'max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-divider sm:w-[min(560px,calc(100vw-2rem))]',
      header: 'px-4 pt-4 pb-0 sm:px-6 sm:pt-6',
      content: 'max-h-[calc(100vh-13rem)] overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6',
      footer: 'px-4 pb-4 pt-0 sm:px-6 sm:pb-6',
    }"
    :visible="props.isOpen"
    @update:visible="emit('close')"
  >
    <template #header>
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          Task &amp; timer
        </h2>
        <p class="text-text-muted text-[13px]">
          Select a visible project and task, update the current timer when needed, or create a new task inside the selected project.
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <div
        v-if="props.timerActionErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          {{ props.isTimerRunning ? "Could not stop the timer." : "Could not start the timer." }}
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.timerActionErrorMessage }}
        </p>
      </div>

      <div
        v-if="props.projectsErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          Could not load visible projects.
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.projectsErrorMessage }}
        </p>
      </div>

      <div
        v-if="props.selectionUpdateErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          Could not update the active timer task.
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.selectionUpdateErrorMessage }}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-project"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <AutoComplete
          class="max-w-full min-w-0"
          fluid
          force-selection
          input-id="top-bar-timer-project"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          :overlay-class="taskSelectOverlayClass"
          option-label="name"
          :disabled="props.isLoadingProjects || props.isConfirmingSelection"
          :loading="props.isLoadingProjects"
          :min-length="0"
          :model-value="selectedProjectModel"
          placeholder="Select a project"
          :pt="taskAutoCompletePt"
          :suggestions="projectSuggestions"
          @complete="handleProjectComplete"
          @update:model-value="handleProjectUpdate(($event ?? null) as ProjectResponse | string | null)"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-task"
          class="text-text-dark text-[13px] font-medium"
        >
          Task
        </label>
        <AutoComplete
          class="max-w-full min-w-0"
          fluid
          force-selection
          input-id="top-bar-timer-task"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          :overlay-class="taskSelectOverlayClass"
          option-label="title"
          :disabled="!props.selectedProjectId || props.isLoadingTasks || props.isConfirmingSelection"
          :loading="props.isLoadingTasks"
          :min-length="0"
          :model-value="selectedTaskModel"
          placeholder="Select a task"
          :pt="taskAutoCompletePt"
          :suggestions="taskSuggestions"
          @complete="handleTaskComplete"
          @update:model-value="handleTaskUpdate(($event ?? null) as TaskResponse | string | null)"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-description"
          class="text-text-dark text-[13px] font-medium"
        >
          Description
        </label>
        <Textarea
          id="top-bar-timer-description"
          v-model="selectedDescriptionModel"
          auto-resize
          fluid
          rows="4"
          :disabled="props.isConfirmingSelection"
        />
      </div>

      <div
        v-if="props.isLoadingTasks && props.selectedProjectId"
        class="bg-app-bg flex min-h-16 items-center justify-center rounded-lg"
      >
        <ProgressSpinner
          stroke-width="3"
          style="width:28px;height:28px"
        />
      </div>

      <div
        v-else-if="props.tasksErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          Could not load tasks for this project.
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.tasksErrorMessage }}
        </p>
      </div>

      <div
        v-else-if="props.selectedProjectId && !props.taskOptions.length"
        class="bg-app-bg rounded-lg p-3"
      >
        <p class="text-text-dark text-sm font-medium">
          No active tasks in this project.
        </p>
        <p class="text-text-muted mt-1 text-xs">
          Create one below or choose a different project.
        </p>
      </div>

      <section class="bg-app-bg rounded-lg p-4">
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <h3 class="text-text-dark text-[13px] font-medium">
              Create new task in selected project
            </h3>
            <p class="text-text-muted text-xs">
              New tasks are created only inside the currently selected visible project.
            </p>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="top-bar-timer-new-task-title"
              class="text-text-dark text-[13px] font-medium"
            >
              Task title
            </label>
            <InputText
              id="top-bar-timer-new-task-title"
              v-model="createTaskTitleModel"
              class="h-[38px] w-full"
              :disabled="!props.selectedProjectId || props.isCreatingTask || props.isConfirmingSelection"
              :invalid="!!props.createTaskErrorMessage"
            />
            <small
              v-if="props.createTaskErrorMessage"
              class="text-destructive text-xs"
            >
              {{ props.createTaskErrorMessage }}
            </small>
          </div>

          <div
            class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid="top-bar-timer-create-task-actions"
          >
            <p class="text-text-muted text-xs">
              {{ props.selectedProjectId ? 'The new task is created in the selected project only.' : 'Select a project first.' }}
            </p>
            <Button
              type="button"
              class="w-full sm:w-auto"
              severity="secondary"
              :disabled="props.isCreateTaskDisabled || props.isConfirmingSelection"
              :fluid="isMobileViewport"
              label="Create task"
              :loading="props.isCreatingTask"
              @click="emit('createTask')"
            />
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div
        :class="[
          'flex w-full gap-2',
          isMobileViewport ? 'flex-col' : 'flex-row justify-end',
        ]"
        data-testid="top-bar-timer-task-dialog-footer"
      >
        <Button
          v-if="isMobileViewport"
          type="button"
          class="w-full"
          :disabled="props.isPrimaryActionDisabled"
          :fluid="true"
          :label="props.primaryActionLabel"
          :loading="props.isPrimaryActionPending"
          @click="emit('primary-action')"
        />
        <Button
          v-if="isMobileViewport && props.isTimerRunning"
          type="button"
          class="w-full"
          :disabled="props.isConfirmSelectionDisabled"
          :fluid="true"
          label="Change task"
          :loading="props.isConfirmingSelection"
          @click="emit('confirm')"
        />
        <Button
          type="button"
          :class="isMobileViewport ? 'w-full' : 'w-auto'"
          :fluid="isMobileViewport"
          label="Cancel"
          severity="secondary"
          text
          @click="emit('close')"
        />
        <Button
          v-if="!isMobileViewport && props.isTimerRunning"
          type="button"
          class="w-auto"
          :disabled="props.isConfirmSelectionDisabled"
          :fluid="false"
          label="Change task"
          :loading="props.isConfirmingSelection"
          severity="secondary"
          text
          @click="emit('confirm')"
        />
        <Button
          v-if="!isMobileViewport"
          type="button"
          :class="isMobileViewport ? 'w-full' : 'w-auto'"
          :fluid="isMobileViewport"
          :disabled="props.isPrimaryActionDisabled"
          :label="props.primaryActionLabel"
          :loading="props.isPrimaryActionPending"
          @click="emit('primary-action')"
        />
      </div>
    </template>
  </Dialog>
</template>
