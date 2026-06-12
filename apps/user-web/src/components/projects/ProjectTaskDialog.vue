<script setup lang="ts">
import AutoComplete, { type AutoCompleteCompleteEvent } from "primevue/autocomplete";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import type { ProjectResponse, TaskPriority, TaskStatus } from "@gitiempo/shared";
import { computed, ref } from "vue";

interface TaskAssigneeOption {
  label: string;
  value: string;
}

const props = defineProps<{
  assigneeId: string | null;
  assigneeOptions: TaskAssigneeOption[];
  description: string;
  errors: {
    assigneeId: string | null;
    description: string | null;
    priority: string | null;
    projectId: string | null;
    status: string | null;
    title: string | null;
  };
  isOpen: boolean;
  isSaving: boolean;
  mode: "create" | "edit" | null;
  priority: TaskPriority;
  projectId: string | null;
  projects: ProjectResponse[];
  requestErrorMessage: string | null;
  saveLabel: string;
  status: TaskStatus;
  subtitle: string;
  title: string;
  valueTitle: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  "update:assigneeId": [value: string | null];
  "update:description": [value: string];
  "update:priority": [value: TaskPriority];
  "update:projectId": [value: string | null];
  "update:status": [value: TaskStatus];
  "update:title": [value: string];
}>();

const statusOptions = [
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
] satisfies { label: string; value: TaskStatus }[];

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] satisfies { label: string; value: TaskPriority }[];

const selectedProjectName = computed(() => {
  return props.projects.find((project) => project.id === props.projectId)?.name ?? "";
});
const projectSuggestions = ref<ProjectResponse[]>([]);
const assigneeSuggestions = ref<TaskAssigneeOption[]>([]);

const projectModel = computed({
  get: () => {
    return props.projects.find((project) => project.id === props.projectId) ?? null;
  },
  set: (value: ProjectResponse | string | null | undefined) => {
    emit("update:projectId", resolveProjectId(value));
  },
});

const statusModel = computed({
  get: () => props.status,
  set: (value: TaskStatus | null | undefined) => {
    emit("update:status", value ?? "open");
  },
});

const assigneeModel = computed({
  get: () => {
    return props.assigneeOptions.find((option) => option.value === props.assigneeId) ?? null;
  },
  set: (value: TaskAssigneeOption | string | null | undefined) => {
    emit("update:assigneeId", resolveAssigneeId(value));
  },
});

const descriptionModel = computed({
  get: () => props.description,
  set: (value: string) => {
    emit("update:description", value);
  },
});

const priorityModel = computed({
  get: () => props.priority,
  set: (value: TaskPriority | null | undefined) => {
    emit("update:priority", value ?? "medium");
  },
});

const titleModel = computed({
  get: () => props.valueTitle,
  set: (value: string) => {
    emit("update:title", value);
  },
});

function completeProjects(event: AutoCompleteCompleteEvent): void {
  projectSuggestions.value = filterOptions(props.projects, event.query, "name");
}

function completeAssignees(event: AutoCompleteCompleteEvent): void {
  assigneeSuggestions.value = filterOptions(props.assigneeOptions, event.query, "label");
}

function filterOptions<T extends object>(
  options: T[],
  query: string,
  labelKey: keyof T,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...options];

  return options.filter((option) =>
    String(option[labelKey] ?? "").toLocaleLowerCase().includes(normalizedQuery),
  );
}

function resolveProjectId(
  value: ProjectResponse | string | null | undefined,
): string | null {
  if (typeof value === "string") {
    return props.projects.find((project) => project.name === value)?.id ?? null;
  }
  return value?.id ?? null;
}

function resolveAssigneeId(
  value: TaskAssigneeOption | string | null | undefined,
): string | null {
  if (typeof value === "string") {
    return props.assigneeOptions.find((option) => option.label === value)?.value ?? null;
  }
  return value?.value ?? null;
}
</script>

<template>
  <Dialog
    :closable="!props.isSaving"
    modal
    :dismissable-mask="!props.isSaving"
    :draggable="false"
    :pt="{
      root: 'w-[min(480px,calc(100vw-2rem))] rounded-lg border border-divider',
      header: 'px-6 pt-6 pb-0',
      content: 'px-6 pb-6 pt-4',
      footer: 'px-6 pb-6 pt-0',
    }"
    :visible="props.isOpen"
    @update:visible="(nextVisible) => {
      if (!nextVisible && !props.isSaving) {
        emit('close');
      }
    }"
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
      <div
        v-if="props.requestErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          {{ props.mode === 'edit' ? 'Could not update this task.' : 'Could not create this task.' }}
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.requestErrorMessage }}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label
          id="project-task-project-label"
          :for="props.mode === 'edit' ? undefined : 'project-task-project'"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <div
          v-if="props.mode === 'edit'"
          aria-labelledby="project-task-project-label"
          class="border-divider bg-surface-primary text-text-dark flex h-[38px] items-center rounded-md border px-3 text-sm"
          role="textbox"
          aria-readonly="true"
        >
          {{ selectedProjectName }}
        </div>
        <AutoComplete
          v-else
          v-model="projectModel"
          dropdown
          dropdown-mode="blank"
          force-selection
          fluid
          input-id="project-task-project"
          option-label="name"
          placeholder="Select project"
          :complete-on-focus="true"
          :disabled="props.isSaving"
          :invalid="!!props.errors.projectId"
          :min-length="0"
          :suggestions="projectSuggestions"
          @complete="completeProjects"
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
          for="project-task-title"
          class="text-text-dark text-[13px] font-medium"
        >
          Task title
        </label>
        <InputText
          id="project-task-title"
          v-model="titleModel"
          class="h-[38px] w-full"
          :disabled="props.isSaving"
          :invalid="!!props.errors.title"
        />
        <small
          v-if="props.errors.title"
          class="text-destructive text-xs"
        >
          {{ props.errors.title }}
        </small>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="project-task-description"
          class="text-text-dark text-[13px] font-medium"
        >
          Description
        </label>
        <Textarea
          id="project-task-description"
          v-model="descriptionModel"
          auto-resize
          class="w-full"
          :disabled="props.isSaving"
          :invalid="!!props.errors.description"
          :maxlength="2000"
          placeholder="Add context, acceptance notes, or links"
          rows="4"
        />
        <small
          v-if="props.errors.description"
          class="text-destructive text-xs"
        >
          {{ props.errors.description }}
        </small>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label
            for="project-task-priority"
            class="text-text-dark text-[13px] font-medium"
          >
            Priority
          </label>
          <Select
            v-model="priorityModel"
            fluid
            input-id="project-task-priority"
            option-label="label"
            option-value="value"
            :disabled="props.isSaving"
            :invalid="!!props.errors.priority"
            :options="priorityOptions"
          />
          <small
            v-if="props.errors.priority"
            class="text-destructive text-xs"
          >
            {{ props.errors.priority }}
          </small>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="project-task-status"
            class="text-text-dark text-[13px] font-medium"
          >
            Status
          </label>
          <Select
            v-model="statusModel"
            fluid
            input-id="project-task-status"
            option-label="label"
            option-value="value"
            :disabled="props.isSaving"
            :invalid="!!props.errors.status"
            :options="statusOptions"
          />
          <small
            v-if="props.errors.status"
            class="text-destructive text-xs"
          >
            {{ props.errors.status }}
          </small>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="project-task-assignee"
          class="text-text-dark text-[13px] font-medium"
        >
          Assignee
        </label>
        <AutoComplete
          v-model="assigneeModel"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          empty-message="No assigned project members"
          force-selection
          fluid
          input-id="project-task-assignee"
          option-label="label"
          placeholder="Unassigned"
          show-clear
          :disabled="props.isSaving || !props.projectId || props.assigneeOptions.length === 0"
          :invalid="!!props.errors.assigneeId"
          :min-length="0"
          :suggestions="assigneeSuggestions"
          @complete="completeAssignees"
        />
        <small
          v-if="props.errors.assigneeId"
          class="text-destructive text-xs"
        >
          {{ props.errors.assigneeId }}
        </small>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          variant="outlined"
          :disabled="props.isSaving"
          @click="emit('close')"
        />
        <Button
          type="button"
          :label="props.saveLabel"
          :loading="props.isSaving"
          @click="emit('save')"
        />
      </div>
    </template>
  </Dialog>
</template>
