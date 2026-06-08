<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import ProgressSpinner from "primevue/progressspinner";
import Textarea from "primevue/textarea";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { useIsMobileViewport } from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

import { TOP_BAR_TIMER_NEW_TASK_ID } from "@/lib/top-bar-timer-helpers";

type ProjectAutoCompleteValue = ProjectResponse | string | null;

interface NewTaskOption {
  id: typeof TOP_BAR_TIMER_NEW_TASK_ID;
  isNewTask: true;
  title: "New task";
}

type TaskPickerOption = TaskResponse | NewTaskOption;
type TaskAutoCompleteValue = TaskPickerOption | string | null;

interface AutoCompleteCompleteEvent {
  query: string;
}

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
  projectOptions: ProjectResponse[];
  primaryActionLabel: string;
  projectsErrorMessage: string | null;
  selectedDescription: string;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  selectionUpdateErrorMessage: string | null;
  taskOptions: TaskResponse[];
  timerActionErrorMessage: string | null;
  tasksErrorMessage: string | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
  primaryAction: [];
  "update:createTaskTitle": [value: string];
  "update:selectedDescription": [value: string];
  "update:selectedProjectId": [value: string | null];
  "update:selectedTaskId": [value: string | null];
}>();

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
const dialogTitle = computed(() =>
  props.primaryActionLabel === "Stop" ? "Update timer task" : "Start timer",
);
const dialogDescription = computed(() =>
  props.primaryActionLabel === "Stop"
    ? "Move the running timer to a different task, or pick New task in the selected project."
    : "Choose a visible project and task, or pick New task before starting the timer.",
);
const primaryButtonLabel = computed(() =>
  props.primaryActionLabel === "Stop" ? "Stop timer" : "Start timer",
);
const taskSelectOverlayClass = "max-w-[calc(100vw-2rem)]";
const taskAutoCompletePt = {
  listContainer: { class: "max-w-full" },
  option: { class: "min-w-0 truncate" },
  root: {
    class:
      "border-divider bg-surface-primary flex h-[38px] w-full max-w-full min-w-0 items-center rounded-sm border",
  },
} as const;
const autoCompleteInputClass =
  "text-text-dark h-full min-w-0 flex-1 border-0 bg-transparent py-0 pr-28 pl-3 text-sm font-medium outline-none ring-0 placeholder:text-text-muted";
const newTaskOption: NewTaskOption = {
  id: TOP_BAR_TIMER_NEW_TASK_ID,
  isNewTask: true,
  title: "New task",
};
const taskPickerOptions = computed<TaskPickerOption[]>(() => [
  ...props.taskOptions,
  newTaskOption,
]);
const mobileProjectModel = shallowRef<ProjectAutoCompleteValue>(null);
const mobileTaskModel = shallowRef<TaskAutoCompleteValue>(null);
const projectSuggestions = shallowRef<ProjectResponse[]>([]);
const taskSuggestions = shallowRef<TaskPickerOption[]>([]);
const isNewTaskSelected = computed(
  () => props.selectedTaskId === TOP_BAR_TIMER_NEW_TASK_ID,
);
const selectedProjectName = computed(
  () => findProjectOption(props.selectedProjectId)?.name ?? null,
);
const newTaskHint = computed(() => {
  const projectName = selectedProjectName.value ?? "the selected project";
  const actionLabel = props.primaryActionLabel === "Stop" ? "change task" : "start the timer";

  return `This task is created in ${projectName} and inherits the project billable default when you ${actionLabel}.`;
});
const confirmButtonLoading = computed(() =>
  isNewTaskSelected.value ? props.isCreatingTask : props.isConfirmingSelection,
);
const primaryButtonLoading = computed(() =>
  props.primaryActionLabel === "Stop" || !isNewTaskSelected.value
    ? props.isPrimaryActionPending
    : props.isCreatingTask,
);

function findProjectOption(projectId: string | null): ProjectResponse | null {
  if (!projectId) {
    return null;
  }

  return props.projectOptions.find((project) => project.id === projectId) ?? null;
}

function findTaskOption(taskId: string | null): TaskPickerOption | null {
  if (!taskId) {
    return null;
  }

  if (taskId === TOP_BAR_TIMER_NEW_TASK_ID) {
    return newTaskOption;
  }

  return props.taskOptions.find((task) => task.id === taskId) ?? null;
}

function matchesQuery(label: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  return normalizedQuery === "" || label.toLowerCase().includes(normalizedQuery);
}

function isProjectOption(
  value: ProjectAutoCompleteValue | undefined,
): value is ProjectResponse {
  return typeof value === "object" && value !== null && "name" in value;
}

function isTaskOption(
  value: TaskAutoCompleteValue | undefined,
): value is TaskPickerOption {
  return typeof value === "object" && value !== null && "title" in value;
}

function handleMobileProjectUpdate(
  value: ProjectAutoCompleteValue | undefined,
): void {
  mobileProjectModel.value = value ?? null;

  if (isProjectOption(value)) {
    emit("update:selectedProjectId", value.id);
    return;
  }

  if (value === null || value === undefined) {
    emit("update:selectedProjectId", null);
  }
}

function handleMobileTaskUpdate(value: TaskAutoCompleteValue | undefined): void {
  mobileTaskModel.value = value ?? null;

  if (isTaskOption(value)) {
    emit("update:selectedTaskId", value.id);
    return;
  }

  if (value === null || value === undefined) {
    emit("update:selectedTaskId", null);
  }
}

function handleProjectComplete(event: AutoCompleteCompleteEvent): void {
  projectSuggestions.value = props.projectOptions.filter((project) =>
    matchesQuery(project.name, event.query),
  );
}

function handleTaskComplete(event: AutoCompleteCompleteEvent): void {
  taskSuggestions.value = taskPickerOptions.value.filter((task) =>
    matchesQuery(task.title, event.query),
  );
}

watch(
  [() => props.selectedProjectId, () => props.projectOptions],
  () => {
    mobileProjectModel.value = findProjectOption(props.selectedProjectId);
    projectSuggestions.value = props.projectOptions;
  },
  { immediate: true },
);

watch(
  [() => props.selectedTaskId, taskPickerOptions],
  () => {
    mobileTaskModel.value = findTaskOption(props.selectedTaskId);
    taskSuggestions.value = taskPickerOptions.value;
  },
  { immediate: true },
);
</script>

<template>
  <Dialog
    modal
    block-scroll
    :closable="false"
    :dismissable-mask="true"
    :draggable="false"
    :pt="{
      root: 'max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-divider bg-surface-primary shadow-none sm:w-[558px]',
      header: 'px-4 pt-4 pb-0 sm:px-6 sm:pt-6',
      content: 'max-h-[calc(100vh-9rem)] overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6',
    }"
    :visible="props.isOpen"
    @update:visible="emit('close')"
  >
    <template #header>
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          {{ dialogTitle }}
        </h2>
        <p class="text-text-muted text-[13px]">
          {{ dialogDescription }}
        </p>
      </div>
    </template>

    <div class="flex flex-col gap-4">
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

      <div
        v-if="props.timerActionErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          Could not {{ props.primaryActionLabel === 'Stop' ? 'stop' : 'start' }} the timer.
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.timerActionErrorMessage }}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-project"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <div class="relative">
          <AutoComplete
            unstyled
            class="h-[38px] w-full max-w-full min-w-0"
            complete-on-focus
            data-key="id"
            dropdown
            dropdown-class="h-full w-0 shrink-0 overflow-hidden border-0 p-0"
            dropdown-icon="hidden"
            dropdown-mode="blank"
            fluid
            force-selection
            :input-class="autoCompleteInputClass"
            input-id="top-bar-timer-project"
            :min-length="0"
            option-label="name"
            :disabled="props.isLoadingProjects || props.isConfirmingSelection"
            :loading="props.isLoadingProjects"
            :model-value="mobileProjectModel"
            :overlay-class="taskSelectOverlayClass"
            placeholder="Search projects"
            :pt="taskAutoCompletePt"
            :suggestions="projectSuggestions"
            @complete="handleProjectComplete"
            @update:model-value="handleMobileProjectUpdate"
          />
          <span class="text-brand pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium">
            AutoComplete
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-task"
          class="text-text-dark text-[13px] font-medium"
        >
          Task
        </label>
        <div class="relative">
          <AutoComplete
            unstyled
            class="h-[38px] w-full max-w-full min-w-0"
            complete-on-focus
            data-key="id"
            dropdown
            dropdown-class="h-full w-0 shrink-0 overflow-hidden border-0 p-0"
            dropdown-icon="hidden"
            dropdown-mode="blank"
            fluid
            force-selection
            :input-class="autoCompleteInputClass"
            input-id="top-bar-timer-task"
            :min-length="0"
            option-label="title"
            :disabled="!props.selectedProjectId || props.isLoadingTasks || props.isConfirmingSelection"
            :loading="props.isLoadingTasks"
            :model-value="mobileTaskModel"
            :overlay-class="taskSelectOverlayClass"
            placeholder="Search tasks"
            :pt="taskAutoCompletePt"
            :suggestions="taskSuggestions"
            @complete="handleTaskComplete"
            @update:model-value="handleMobileTaskUpdate"
          />
          <span class="text-brand pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium">
            AutoComplete
          </span>
        </div>
        <small class="text-text-muted text-xs">
          Visible tasks are listed first. New task is the last option. New time entries inherit the selected task billable default.
        </small>

        <div
          v-if="isNewTaskSelected"
          class="mt-1 flex flex-col gap-1"
        >
          <label
            for="top-bar-timer-new-task-title"
            class="text-text-dark text-[13px] font-medium"
          >
            New task title
          </label>
          <div class="relative">
            <InputText
              id="top-bar-timer-new-task-title"
              v-model="createTaskTitleModel"
              class="text-text-muted h-[38px] w-full pr-20 text-sm font-medium"
              :disabled="!props.selectedProjectId || props.isCreatingTask || props.isConfirmingSelection"
              :invalid="!!props.createTaskErrorMessage"
            />
            <span class="text-text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium">
              Required
            </span>
          </div>
          <small
            v-if="props.createTaskErrorMessage"
            class="text-destructive text-xs"
          >
            {{ props.createTaskErrorMessage }}
          </small>
          <small
            v-else
            class="text-text-muted text-xs"
          >
            {{ newTaskHint }}
          </small>
        </div>
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
        v-else-if="props.selectedProjectId && !props.taskOptions.length && !isNewTaskSelected"
        class="bg-app-bg rounded-lg p-3"
      >
        <p class="text-text-dark text-sm font-medium">
          No existing active tasks in this project.
        </p>
        <p class="text-text-muted mt-1 text-xs">
          Pick New task to create one, or choose a different project.
        </p>
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
          class="text-text-muted h-[82px] min-h-[82px] resize-none text-sm"
          fluid
          rows="3"
          :disabled="props.isConfirmingSelection"
        />
      </div>

      <div
        :class="[
          'flex w-full gap-2.5',
          isMobileViewport ? 'flex-col' : 'flex-row justify-end',
        ]"
        data-testid="top-bar-timer-task-dialog-footer"
      >
        <Button
          v-if="props.primaryActionLabel === 'Stop'"
          unstyled
          type="button"
          :class="[
            'border-divider bg-surface-primary text-text-dark h-[37px] rounded-sm border px-4 text-sm font-semibold',
            isMobileViewport ? 'w-full' : 'w-auto',
          ]"
          :disabled="props.isConfirmSelectionDisabled"
          :fluid="isMobileViewport"
          label="Change task"
          :loading="confirmButtonLoading"
          severity="secondary"
          variant="outlined"
          @click="emit('confirm')"
        />
        <Button
          unstyled
          type="button"
          :class="[
            'bg-brand text-text-inverse border-brand h-[37px] rounded-sm border px-4 text-sm font-semibold',
            isMobileViewport ? 'w-full' : 'w-auto',
          ]"
          :disabled="props.isPrimaryActionDisabled"
          :fluid="isMobileViewport"
          :label="primaryButtonLabel"
          :loading="primaryButtonLoading"
          @click="emit('primaryAction')"
        />
      </div>
    </div>
  </Dialog>
</template>
