<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { giTiempoSelfAppendedAutoCompleteDropdownPt } from "@gitiempo/web-config/theme";
import {
  AppDialog,
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

interface GitHubProjectRepositoryBadge {
  fullName: string;
  isTracked: boolean;
}

interface GitHubProjectPickerOption {
  hasMoreRepositories: boolean;
  id: string;
  isGitHubProjectOption: true;
  name: string;
  repositoryBadges: GitHubProjectRepositoryBadge[];
}

type ProjectPickerOption = GitHubProjectPickerOption | ProjectResponse;
type ProjectAutoCompleteValue = ProjectPickerOption | string | null;

interface ProjectOptionGroup {
  items: ProjectPickerOption[];
  label: string;
}
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
  githubProjectDraftCount: number;
  githubProjectOptions: { id: string; title: string }[];
  githubProjectRepositories: Record<
    string,
    { hasMore: boolean; repositories: string[] }
  >;
  githubTrackedRepositoryKeys: Set<string>;
  githubProjectsErrorMessage: string | null;
  githubProjectsTruncated: boolean;
  isLoadingGitHubProjects: boolean;
  isLoadingProjects: boolean;
  selectedGitHubProjectId: string | null;
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
  "update:selectedGitHubProjectId": [value: string | null];
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
const taskPickerOptions = computed<TaskPickerOption[]>(() =>
  isGitHubProjectSelected.value
    ? [...props.taskOptions]
    : [...props.taskOptions, newTaskOption],
);
const mobileProjectModel = shallowRef<ProjectAutoCompleteValue>(null);
const mobileTaskModel = shallowRef<TaskAutoCompleteValue>(null);
const projectSuggestions = shallowRef<ProjectOptionGroup[]>([]);
const githubProjectPickerOptions = computed<GitHubProjectPickerOption[]>(() =>
  props.githubProjectOptions.map((board) => {
    const summary = props.githubProjectRepositories[board.id];

    return {
      hasMoreRepositories: summary?.hasMore ?? false,
      id: board.id,
      isGitHubProjectOption: true as const,
      name: board.title,
      repositoryBadges: (summary?.repositories ?? []).map((fullName) => ({
        fullName,
        isTracked: props.githubTrackedRepositoryKeys.has(
          fullName.toLowerCase(),
        ),
      })),
    };
  }),
);
const allProjectPickerOptions = computed<ProjectPickerOption[]>(() => [
  ...props.projectOptions,
  ...githubProjectPickerOptions.value,
]);
const isGitHubProjectSelected = computed(
  () => props.selectedGitHubProjectId !== null,
);
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
    isGitHubProjectSelected.value ||
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
  () =>
    findProjectOption(props.selectedGitHubProjectId ?? props.selectedProjectId)
      ?.name ?? null,
);
const newTaskHint = computed(() => {
  const projectName = selectedProjectName.value ?? "the selected project";
  const actionLabel = props.primaryActionLabel === "Stop" ? "change task" : "start the timer";

  return `This task is created in ${projectName} and inherits the project billable default when you ${actionLabel}.`;
});
function findProjectOption(
  projectId: string | null,
): ProjectPickerOption | null {
  if (!projectId) {
    return null;
  }

  return (
    allProjectPickerOptions.value.find((project) => project.id === projectId) ??
    null
  );
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
): value is ProjectPickerOption {
  return typeof value === "object" && value !== null && "name" in value;
}

function isGitHubProjectPickerOption(
  value: ProjectPickerOption,
): value is GitHubProjectPickerOption {
  return "isGitHubProjectOption" in value;
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
    if (isGitHubProjectPickerOption(value)) {
      emit("update:selectedGitHubProjectId", value.id);
      return;
    }

    emit("update:selectedProjectId", value.id);
    return;
  }

  if (value === null || value === undefined) {
    emit("update:selectedGitHubProjectId", null);
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

function buildProjectGroups(
  projects: ProjectResponse[],
  boards: GitHubProjectPickerOption[],
): ProjectOptionGroup[] {
  const groups: ProjectOptionGroup[] = [];

  if (projects.length > 0) {
    groups.push({ items: projects, label: "Projects" });
  }

  if (boards.length > 0) {
    groups.push({ items: boards, label: "GitHub Projects" });
  }

  return groups;
}

function handleProjectComplete(event: AutoCompleteCompleteEvent): void {
  const projects = filterAutocompleteOptions(
    props.projectOptions,
    event.query,
    (project) => project.name,
  );
  const boards = filterAutocompleteOptions(
    githubProjectPickerOptions.value,
    event.query,
    (board) => board.name,
  );
  projectSuggestions.value = buildProjectGroups(projects, boards);
}

function handleTaskComplete(event: AutoCompleteCompleteEvent): void {
  const selectedTaskTitle = isTaskOption(mobileTaskModel.value)
    ? mobileTaskModel.value.title
    : null;
  const query = event.query === selectedTaskTitle ? "" : event.query;

  const matches = filterAutocompleteOptions(
    props.taskOptions,
    query,
    (task) => task.title,
  );

  taskSuggestions.value = isGitHubProjectSelected.value
    ? matches
    : [...matches, newTaskOption];
}

watch(
  [
    () => props.selectedProjectId,
    () => props.selectedGitHubProjectId,
    () => props.projectOptions,
    () => props.githubProjectOptions,
  ],
  () => {
    mobileProjectModel.value = findProjectOption(
      props.selectedGitHubProjectId ?? props.selectedProjectId,
    );
    projectSuggestions.value = buildProjectGroups(
      props.projectOptions,
      githubProjectPickerOptions.value,
    );
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
  <AppDialog
    modal
    block-scroll
    :dismissable-mask="true"
    :draggable="false"
    :pt="{
      root: 'max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-divider bg-surface-primary shadow-none sm:w-[558px]',
      content: 'max-h-[calc(100vh-9rem)] overflow-y-auto px-6 pb-6 pt-4',
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
              option-group-label="label"
              option-group-children="items"
              :disabled="
                props.isLoadingProjects ||
                  props.isLoadingGitHubProjects ||
                  props.isConfirmingSelection
              "
              :loading="props.isLoadingProjects || props.isLoadingGitHubProjects"
              :model-value="mobileProjectModel"
              placeholder="Search projects"
              :pt="giTiempoSelfAppendedAutoCompleteDropdownPt"
              :suggestions="projectSuggestions"
              @complete="handleProjectComplete"
              @update:model-value="handleMobileProjectUpdate"
            >
              <template #option="slotProps">
                <div class="flex min-w-0 flex-col gap-1 py-0.5">
                  <span class="truncate">{{ slotProps.option.name }}</span>
                  <span
                    v-if="isGitHubProjectPickerOption(slotProps.option)"
                    class="flex flex-wrap items-center gap-1"
                    data-testid="top-bar-timer-board-repositories"
                  >
                    <span
                      v-for="badge in slotProps.option.repositoryBadges"
                      :key="badge.fullName"
                      class="inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[11px] leading-4"
                      :class="
                        badge.isTracked
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-surface-300 text-text-muted'
                      "
                      :data-tracked="badge.isTracked ? 'true' : 'false'"
                    >
                      {{ badge.fullName }}
                      <span
                        v-if="badge.isTracked"
                        aria-hidden="true"
                      >&#10003;</span>
                    </span>
                    <span
                      v-if="slotProps.option.repositoryBadges.length === 0"
                      class="text-text-muted text-[11px] leading-4"
                    >
                      No linked repository
                    </span>
                    <span
                      v-else-if="slotProps.option.hasMoreRepositories"
                      class="text-text-muted text-[11px] leading-4"
                    >
                      and more
                    </span>
                  </span>
                </div>
              </template>
            </AutoComplete>
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
              :pt="giTiempoSelfAppendedAutoCompleteDropdownPt"
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

        <InlineRequestMessage
          v-if="!props.isLoadingTasks && props.tasksErrorMessage"
          :message="props.tasksErrorMessage"
          title="Could not load tasks for this project."
        />

        <div
          v-else-if="!props.isLoadingTasks && (props.selectedProjectId || isGitHubProjectSelected) && !props.taskOptions.length && !isNewTaskSelected"
          class="bg-app-bg rounded-lg p-3"
        >
          <p class="text-text-dark text-sm font-medium">
            {{
              isGitHubProjectSelected
                ? 'This GitHub project has no issues to track yet.'
                : 'No existing active tasks in this project.'
            }}
          </p>
          <p class="text-text-muted mt-1 text-xs">
            {{
              isGitHubProjectSelected
                ? 'Add an issue to it on GitHub, or choose a different project.'
                : 'Pick New task to create one, or choose a different project.'
            }}
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
          type="button"
          :aria-busy="primaryButtonLoading ? 'true' : undefined"
          :aria-label="primaryButtonLabel"
          class="h-[37px] min-w-[96px]"
          data-testid="top-bar-timer-primary-action"
          :disabled="isPrimaryButtonDisabled"
          :fluid="true"
          :label="primaryButtonLabel"
          :loading="primaryButtonLoading"
          size="small"
          @click="emit('primaryAction')"
        />
        <Button
          v-if="props.primaryActionLabel === 'Stop' && !props.isCrossWorkspaceTimer"
          type="button"
          :aria-busy="confirmButtonLoading ? 'true' : undefined"
          aria-label="Change task"
          :class="[
            'h-[37px] min-w-[108px]',
            isMobileViewport ? 'w-full' : 'w-auto',
          ]"
          data-testid="top-bar-timer-confirm-action"
          :disabled="isConfirmButtonDisabled"
          :fluid="isMobileViewport"
          label="Change task"
          :loading="confirmButtonLoading"
          severity="secondary"
          size="small"
          variant="outlined"
          @click="emit('confirm')"
        />
        <Button
          v-if="!isMobileViewport || props.primaryActionLabel !== 'Stop'"
          type="button"
          :aria-busy="primaryButtonLoading ? 'true' : undefined"
          :aria-label="primaryButtonLabel"
          :class="[
            'h-[37px] min-w-[96px]',
            isMobileViewport ? 'w-full' : 'w-auto',
          ]"
          data-testid="top-bar-timer-primary-action"
          :disabled="isPrimaryButtonDisabled"
          :fluid="isMobileViewport"
          :label="primaryButtonLabel"
          :loading="primaryButtonLoading"
          size="small"
          @click="emit('primaryAction')"
        />
      </div>
    </div>
  </AppDialog>
</template>
