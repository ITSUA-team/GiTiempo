<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import type { ProjectResponse } from "@gitiempo/shared";
import {
  composeGiTiempoSelfAppendedAutoCompletePt,
  giTiempoSelfAppendedAutoCompletePt,
} from "@gitiempo/web-config/theme";
import {
  filterAutocompleteOptions,
  InlineRequestMessage,
  LabeledCheckbox,
} from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

import {
  isNewTaskLookupOption,
  type TaskLookupOption,
} from "@/composables/time-entries/time-entry-task-lookup";

type ProjectAutoCompleteValue = ProjectResponse | string | null;
type TaskAutoCompleteValue = string | TaskLookupOption | null;

const props = defineProps<{
  dialogErrorMessage: string | null;
  endedAt: Date | null;
  errors: {
    description: string | null;
    endedAt: string | null;
    newTaskTitle: string | null;
    projectId: string | null;
    startedAt: string | null;
    taskId: string | null;
  };
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isDeleting: boolean;
  isOpen: boolean;
  isSaving: boolean;
  mode: "create" | "edit" | null;
  newTaskTitle: string;
  projectId: string | null;
  projects: ProjectResponse[];
  projectsErrorMessage: string | null;
  saveLabel: string;
  startedAt: Date | null;
  taskSuggestions: TaskLookupOption[];
  taskValue: string | TaskLookupOption | null;
  tasksErrorMessage: string | null;
  title: string;
  subtitle: string;
  valueDescription: string;
  valueIsBillable: boolean;
}>();

const emit = defineEmits<{
  close: [];
  deleteEntry: [];
  save: [];
  taskSearch: [query: string];
  "update:description": [value: string];
  "update:endedAt": [value: Date | null];
  "update:isBillable": [value: boolean];
  "update:newTaskTitle": [value: string];
  "update:projectId": [value: string | null];
  "update:startedAt": [value: Date | null];
  "update:taskValue": [value: string | TaskLookupOption | null];
}>();

const projectModel = shallowRef<ProjectAutoCompleteValue>(null);
const projectSearchQuery = shallowRef("");
const projectSuggestions = shallowRef<ProjectResponse[]>([]);
const taskModel = shallowRef<TaskAutoCompleteValue>(null);
const selectedProject = computed(() =>
  props.projects.find((project) => project.id === props.projectId) ?? null,
);

const startedAtModel = computed({
  get: () => props.startedAt,
  set: (value: Date | null | undefined) => {
    emit("update:startedAt", value ?? null);
  },
});

const endedAtModel = computed({
  get: () => props.endedAt,
  set: (value: Date | null | undefined) => {
    emit("update:endedAt", value ?? null);
  },
});

const descriptionModel = computed({
  get: () => props.valueDescription,
  set: (value: string) => {
    emit("update:description", value);
  },
});

const billableModel = computed({
  get: () => props.valueIsBillable,
  set: (value: boolean) => {
    emit("update:isBillable", value);
  },
});

const newTaskTitleModel = computed({
  get: () => props.newTaskTitle,
  set: (value: string) => {
    emit("update:newTaskTitle", value);
  },
});

const isDialogMutating = computed(() => props.isSaving || props.isDeleting);
const isNewTaskSelected = computed(() =>
  isNewTaskLookupOption(props.taskValue),
);
const selectedProjectName = computed(() => selectedProject.value?.name ?? null);
const newTaskHint = computed(() => {
  const projectName = selectedProjectName.value ?? "the selected project";

  return `This task is created in ${projectName} and inherits the project billable default.`;
});
const projectAutoCompletePt = composeGiTiempoSelfAppendedAutoCompletePt({
  dropdown: {
    onMousedown: handleProjectDropdownMouseDown,
  },
});

watch(
  [() => props.isOpen, () => props.mode, () => props.projectId, () => props.projects],
  () => {
    projectModel.value = selectedProject.value;
    refreshProjectSuggestions("");
  },
  { immediate: true },
);

watch(
  [() => props.isOpen, () => props.mode, () => props.taskValue],
  () => {
    taskModel.value = props.taskValue ?? null;
  },
  { immediate: true },
);

function buildProjectSuggestions(queryValue: string): ProjectResponse[] {
  return filterAutocompleteOptions(
    props.projects,
    queryValue,
    (project) => project.name,
  );
}

function refreshProjectSuggestions(query: string): void {
  projectSearchQuery.value = query;
  projectSuggestions.value = buildProjectSuggestions(query);
}

function handleProjectDropdownMouseDown(event: MouseEvent): void {
  event.preventDefault();
}

function handleProjectComplete(event: { query: string }): void {
  refreshProjectSuggestions(event.query);
}

function isProjectOption(
  value: ProjectAutoCompleteValue | undefined,
): value is ProjectResponse {
  return typeof value === "object" && value !== null && "name" in value;
}

function handleProjectUpdate(value: ProjectAutoCompleteValue | undefined): void {
  projectModel.value = value ?? null;

  if (typeof value === "string") {
    refreshProjectSuggestions(value);

    if (value.trim().length === 0) {
      emit("update:projectId", null);
    }

    return;
  }

  refreshProjectSuggestions("");

  if (isProjectOption(value)) {
    emit("update:projectId", value.id);
    return;
  }

  emit("update:projectId", null);
}

function handleTaskComplete(event: { query: string }): void {
  emit("taskSearch", event.query);
}

function handleTaskUpdate(value: TaskAutoCompleteValue | undefined): void {
  taskModel.value = value ?? null;

  if (typeof value === "string") {
    emit("taskSearch", value);
  }

  emit("update:taskValue", value ?? null);
}
</script>

<template>
  <Dialog
    modal
    :closable="!isDialogMutating"
    :dismissable-mask="!isDialogMutating"
    :draggable="false"
    :pt="{
      root: 'w-[min(560px,calc(100vw-2rem))] rounded-lg border border-divider',
      header: 'px-6 pt-6 pb-0',
      content: 'px-6 pb-6 pt-4',
      footer: 'px-6 pb-6 pt-0',
    }"
    :visible="props.isOpen"
    @update:visible="emit('close')"
  >
    <template #header>
      <div class="flex flex-col gap-1">
        <h2 class="text-text-dark text-lg font-semibold">
          {{ props.title }}
        </h2>
        <p class="text-text-muted text-[13px]">
          {{ props.subtitle }}
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
        v-if="props.dialogErrorMessage"
        :message="props.dialogErrorMessage"
        :title="props.mode === 'edit' ? 'Could not update this entry.' : 'Could not create this entry.'"
      />

      <div class="flex flex-col gap-1">
        <label
          for="time-entry-project"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <AutoComplete
          append-to="self"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          fluid
          force-selection
          input-id="time-entry-project"
          :model-value="projectModel"
          option-label="name"
          :disabled="props.isLoadingProjects || isDialogMutating"
          :invalid="!!props.errors.projectId"
          :loading="props.isLoadingProjects"
          :min-length="0"
          placeholder="Select a project"
          :pt="projectAutoCompletePt"
          :suggestions="projectSuggestions"
          @complete="handleProjectComplete"
          @update:model-value="handleProjectUpdate"
        />
        <small
          v-if="props.errors.projectId"
          class="text-destructive text-xs"
        >
          {{ props.errors.projectId }}
        </small>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="time-entry-task"
          class="text-text-dark text-[13px] font-medium"
        >
          Task
        </label>
        <AutoComplete
          append-to="self"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          fluid
          force-selection
          input-id="time-entry-task"
          :model-value="taskModel"
          :min-length="0"
          option-label="title"
          :disabled="!props.projectId || props.isLoadingTasks || isDialogMutating"
          :invalid="!!props.errors.taskId"
          :loading="props.isLoadingTasks"
          :pt="giTiempoSelfAppendedAutoCompletePt"
          :suggestions="props.taskSuggestions"
          placeholder="Search tasks"
          @complete="handleTaskComplete"
          @update:model-value="handleTaskUpdate"
        />
        <small
          v-if="props.errors.taskId"
          class="text-destructive text-xs"
        >
          {{ props.errors.taskId }}
        </small>
        <small
          v-else-if="props.tasksErrorMessage"
          class="text-destructive text-xs"
        >
          {{ props.tasksErrorMessage }}
        </small>
        <small
          v-else
          class="text-text-muted text-xs"
        >
          Visible tasks are listed first. New task is the last option.
        </small>

        <div
          v-if="isNewTaskSelected"
          class="mt-1 flex flex-col gap-1"
        >
          <label
            for="time-entry-new-task-title"
            class="text-text-dark text-[13px] font-medium"
          >
            New task title
          </label>
          <div class="relative">
            <InputText
              id="time-entry-new-task-title"
              v-model="newTaskTitleModel"
              class="text-text-muted h-[38px] w-full pr-20 text-sm font-medium"
              :disabled="isDialogMutating"
              :invalid="!!props.errors.newTaskTitle"
            />
            <span class="text-text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium">
              Required
            </span>
          </div>
          <small
            v-if="props.errors.newTaskTitle"
            class="text-destructive text-xs"
          >
            {{ props.errors.newTaskTitle }}
          </small>
          <small
            v-else
            class="text-text-muted text-xs"
          >
            {{ newTaskHint }}
          </small>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label
            for="time-entry-started-at"
            class="text-text-dark text-[13px] font-medium"
          >
            Start
          </label>
          <DatePicker
            v-model="startedAtModel"
            fluid
            date-format="M d,"
            hour-format="24"
            input-id="time-entry-started-at"
            :disabled="isDialogMutating"
            :invalid="!!props.errors.startedAt"
            :manual-input="false"
            show-time
          />
          <small
            v-if="props.errors.startedAt"
            class="text-destructive text-xs"
          >
            {{ props.errors.startedAt }}
          </small>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="time-entry-ended-at"
            class="text-text-dark text-[13px] font-medium"
          >
            End
          </label>
          <DatePicker
            v-model="endedAtModel"
            fluid
            date-format="M d,"
            hour-format="24"
            input-id="time-entry-ended-at"
            :disabled="isDialogMutating"
            :invalid="!!props.errors.endedAt"
            :manual-input="false"
            show-time
          />
          <small
            v-if="props.errors.endedAt"
            class="text-destructive text-xs"
          >
            {{ props.errors.endedAt }}
          </small>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="time-entry-description"
          class="text-text-dark text-[13px] font-medium"
        >
          Description
        </label>
        <Textarea
          id="time-entry-description"
          v-model="descriptionModel"
          auto-resize
          rows="4"
          :disabled="isDialogMutating"
          fluid
          :invalid="!!props.errors.description"
        />
        <small
          v-if="props.errors.description"
          class="text-destructive text-xs"
        >
          {{ props.errors.description }}
        </small>
      </div>

      <div class="flex flex-col gap-1">
        <LabeledCheckbox
          v-model="billableModel"
          input-id="time-entry-billable"
          label="Billable entry"
          root-class="border-divider bg-surface-primary flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2"
          :disabled="isDialogMutating"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          v-if="props.mode === 'edit'"
          type="button"
          label="Delete entry"
          severity="danger"
          variant="outlined"
          :disabled="isDialogMutating"
          :loading="props.isDeleting"
          @click="emit('deleteEntry')"
        />
        <Button
          type="button"
          :label="props.saveLabel"
          :disabled="props.isDeleting"
          :loading="props.isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </Dialog>
</template>
