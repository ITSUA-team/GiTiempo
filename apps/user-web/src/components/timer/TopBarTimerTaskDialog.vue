<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import ProgressSpinner from "primevue/progressspinner";
import Textarea from "primevue/textarea";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { giTiempoSelfAppendedAutoCompletePt } from "@gitiempo/web-config/theme";
import {
  filterAutocompleteOptions,
  InlineRequestMessage,
  useIsMobileViewport,
} from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

import {
  createInlineNewTaskOption,
  isInlineNewTaskId,
  type InlineNewTaskOption,
} from "@/lib/inline-new-task";

type ProjectAutoCompleteValue = ProjectResponse | string | null;
type TaskPickerOption = TaskResponse | InlineNewTaskOption;
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
  isCrossWorkspaceTimer: boolean;
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isOpen: boolean;
  isPrimaryActionDisabled: boolean;
  isPrimaryActionPending: boolean;
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
  timerWorkspaceContextLabel: string | null;
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
const dialogTitle = computed(() => {
  if (props.isCrossWorkspaceTimer) {
    return "Timer running in another workspace";
  }

  return props.primaryActionLabel === "Stop" ? "Update timer task" : "Start timer";
});
const dialogDescription = computed(() => {
  if (props.isCrossWorkspaceTimer) {
    return "Stop the running timer before starting or changing tasks in this workspace.";
  }

  return props.primaryActionLabel === "Stop"
    ? "Move the running timer to a different task, or pick New task in the selected project."
    : "Choose a visible project and task, or pick New task before starting the timer.";
});
const primaryButtonLabel = computed(() =>
  props.primaryActionLabel === "Stop" ? "Stop timer" : "Start timer",
);
const newTaskOption = createInlineNewTaskOption();
const taskPickerOptions = computed<TaskPickerOption[]>(() => [
  ...props.taskOptions,
  newTaskOption,
]);
const mobileProjectModel = shallowRef<ProjectAutoCompleteValue>(null);
const mobileTaskModel = shallowRef<TaskAutoCompleteValue>(null);
const projectSuggestions = shallowRef<ProjectResponse[]>([]);
const taskSuggestions = shallowRef<TaskPickerOption[]>([]);
const isNewTaskSelected = computed(
  () => isInlineNewTaskId(props.selectedTaskId),
);
const hasSelectedProjectOption = computed(() =>
  isProjectOption(mobileProjectModel.value),
);
const hasSelectedTaskOption = computed(() => isTaskOption(mobileTaskModel.value));
const isSelectionModelIncomplete = computed(
  () => !hasSelectedProjectOption.value || !hasSelectedTaskOption.value,
);
const confirmButtonLoading = computed(() =>
  isNewTaskSelected.value ? props.isCreatingTask : props.isConfirmingSelection,
);
const primaryButtonLoading = computed(() =>
  props.primaryActionLabel === "Stop" || !isNewTaskSelected.value
    ? props.isPrimaryActionPending
    : props.isCreatingTask,
);
const isTaskAutoCompleteDisabled = computed(
  () =>
    !hasSelectedProjectOption.value ||
    props.isLoadingTasks ||
    props.isConfirmingSelection,
);
const isNewTaskTitleInputDisabled = computed(
  () =>
    !hasSelectedProjectOption.value ||
    props.isCreatingTask ||
    props.isConfirmingSelection,
);
const isPrimaryButtonDisabled = computed(
  () =>
    props.isPrimaryActionDisabled ||
    primaryButtonLoading.value ||
    (props.primaryActionLabel !== "Stop" && isSelectionModelIncomplete.value),
);
const isConfirmButtonDisabled = computed(
  () =>
    props.isCrossWorkspaceTimer ||
    props.isConfirmSelectionDisabled ||
    confirmButtonLoading.value ||
    isSelectionModelIncomplete.value,
);
const selectedProjectName = computed(
  () => findProjectOption(props.selectedProjectId)?.name ?? null,
);
const newTaskHint = computed(() => {
  const projectName = selectedProjectName.value ?? "the selected project";
  const actionLabel = props.primaryActionLabel === "Stop" ? "change task" : "start the timer";

  return `This task is created in ${projectName} and inherits the project billable default when you ${actionLabel}.`;
});
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

  if (isInlineNewTaskId(taskId)) {
    return newTaskOption;
  }

  return props.taskOptions.find((task) => task.id === taskId) ?? null;
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
  projectSuggestions.value = filterAutocompleteOptions(
    props.projectOptions,
    event.query,
    (project) => project.name,
  );
}

function handleTaskComplete(event: AutoCompleteCompleteEvent): void {
  const selectedTaskTitle = isTaskOption(mobileTaskModel.value)
    ? mobileTaskModel.value.title
    : null;
  const query = event.query === selectedTaskTitle ? "" : event.query;

  taskSuggestions.value = [
    ...filterAutocompleteOptions(
      props.taskOptions,
      query,
      (task) => task.title,
    ),
    newTaskOption,
  ];
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
      <InlineRequestMessage
        v-if="props.projectsErrorMessage"
        :message="props.projectsErrorMessage"
        title="Could not load visible projects."
      />

      <InlineRequestMessage
        v-if="props.selectionUpdateErrorMessage"
        :message="props.selectionUpdateErrorMessage"
        title="Could not update the active timer task."
      />

      <InlineRequestMessage
        v-if="props.timerActionErrorMessage"
        :message="props.timerActionErrorMessage"
        :title="`Could not ${props.primaryActionLabel === 'Stop' ? 'stop' : 'start'} the timer.`"
      />

      <div
        v-if="props.isCrossWorkspaceTimer"
        class="border-divider bg-app-bg flex flex-col gap-2 rounded-lg border p-4"
        data-testid="top-bar-timer-cross-workspace-state"
      >
        <p class="text-text-dark text-sm font-semibold">
          Stop timer first
        </p>
        <p class="text-text-muted text-[13px] leading-5">
          <span
            class="text-brand font-semibold"
            data-testid="top-bar-timer-dialog-workspace-label"
          >
            {{ props.timerWorkspaceContextLabel ?? "Running in another workspace" }}
          </span>
          . GiTiempo tracks one timer at a time. Stop this timer, then choose a visible project and task in the active workspace.
        </p>
      </div>

      <template v-else>
        <div class="flex flex-col gap-1">
          <label
            for="top-bar-timer-project"
            class="text-text-dark text-[13px] font-medium"
          >
            Project
          </label>
          <div class="relative">
            <AutoComplete
              append-to="self"
              class="w-full max-w-full min-w-0"
              complete-on-focus
              data-key="id"
              dropdown
              dropdown-mode="blank"
              fluid
              force-selection
              input-id="top-bar-timer-project"
              :min-length="0"
              option-label="name"
              :disabled="props.isLoadingProjects || props.isConfirmingSelection"
              :loading="props.isLoadingProjects"
              :model-value="mobileProjectModel"
              placeholder="Search projects"
              :pt="giTiempoSelfAppendedAutoCompletePt"
              :suggestions="projectSuggestions"
              @complete="handleProjectComplete"
              @update:model-value="handleMobileProjectUpdate"
            />
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
              append-to="self"
              class="w-full max-w-full min-w-0"
              complete-on-focus
              data-key="id"
              dropdown
              dropdown-mode="blank"
              fluid
              force-selection
              input-id="top-bar-timer-task"
              :min-length="0"
              option-label="title"
              :disabled="isTaskAutoCompleteDisabled"
              :loading="props.isLoadingTasks"
              :model-value="mobileTaskModel"
              placeholder="Search tasks"
              :pt="giTiempoSelfAppendedAutoCompletePt"
              :suggestions="taskSuggestions"
              @complete="handleTaskComplete"
              @update:model-value="handleMobileTaskUpdate"
            />
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
                :disabled="isNewTaskTitleInputDisabled"
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

        <InlineRequestMessage
          v-else-if="props.tasksErrorMessage"
          :message="props.tasksErrorMessage"
          title="Could not load tasks for this project."
        />

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
      </template>

      <div
        :class="[
          'flex w-full gap-2.5',
          isMobileViewport ? 'flex-col' : 'flex-row justify-end',
        ]"
        data-testid="top-bar-timer-task-dialog-footer"
      >
        <Button
          v-if="isMobileViewport && props.primaryActionLabel === 'Stop'"
          unstyled
          type="button"
          :aria-busy="primaryButtonLoading ? 'true' : undefined"
          :aria-label="primaryButtonLabel"
          class="bg-brand text-text-inverse border-brand inline-flex h-[37px] min-w-[96px] cursor-pointer items-center justify-center rounded-sm border px-4 text-sm font-semibold disabled:cursor-not-allowed"
          data-testid="top-bar-timer-primary-action"
          :disabled="isPrimaryButtonDisabled"
          :fluid="true"
          @click="emit('primaryAction')"
        >
          <span
            v-if="primaryButtonLoading"
            aria-hidden="true"
            class="border-text-inverse/30 border-t-text-inverse size-4 animate-spin rounded-full border-2"
            data-testid="top-bar-timer-primary-action-spinner"
          />
          <span v-else>{{ primaryButtonLabel }}</span>
        </Button>
        <Button
          v-if="props.primaryActionLabel === 'Stop' && !props.isCrossWorkspaceTimer"
          unstyled
          type="button"
          :aria-busy="confirmButtonLoading ? 'true' : undefined"
          aria-label="Change task"
          :class="[
            'border-divider bg-surface-primary text-text-dark inline-flex h-[37px] min-w-[108px] cursor-pointer items-center justify-center rounded-sm border px-4 text-sm font-semibold disabled:cursor-not-allowed',
            isMobileViewport ? 'w-full' : 'w-auto',
          ]"
          data-testid="top-bar-timer-confirm-action"
          :disabled="isConfirmButtonDisabled"
          :fluid="isMobileViewport"
          severity="secondary"
          variant="outlined"
          @click="emit('confirm')"
        >
          <span
            v-if="confirmButtonLoading"
            aria-hidden="true"
            class="border-brand/30 border-t-brand size-4 animate-spin rounded-full border-2"
            data-testid="top-bar-timer-confirm-action-spinner"
          />
          <span v-else>Change task</span>
        </Button>
        <Button
          v-if="!isMobileViewport || props.primaryActionLabel !== 'Stop'"
          unstyled
          type="button"
          :aria-busy="primaryButtonLoading ? 'true' : undefined"
          :aria-label="primaryButtonLabel"
          :class="[
            'bg-brand text-text-inverse border-brand inline-flex h-[37px] min-w-[96px] cursor-pointer items-center justify-center rounded-sm border px-4 text-sm font-semibold disabled:cursor-not-allowed',
            isMobileViewport ? 'w-full' : 'w-auto',
          ]"
          data-testid="top-bar-timer-primary-action"
          :disabled="isPrimaryButtonDisabled"
          :fluid="isMobileViewport"
          @click="emit('primaryAction')"
        >
          <span
            v-if="primaryButtonLoading"
            aria-hidden="true"
            class="border-text-inverse/30 border-t-text-inverse size-4 animate-spin rounded-full border-2"
            data-testid="top-bar-timer-primary-action-spinner"
          />
          <span v-else>{{ primaryButtonLabel }}</span>
        </Button>
      </div>
    </div>
  </Dialog>
</template>
