<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import type { ProjectResponse, TaskStatus } from "@gitiempo/shared";
import { filterAutocompleteOptions, InlineRequestMessage } from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

const props = defineProps<{
  errors: {
    projectId: string | null;
    status: string | null;
    title: string | null;
  };
  defaultBillableForTimeEntries: boolean;
  isDeleting: boolean;
  isOpen: boolean;
  isSaving: boolean;
  mode: "create" | "edit" | null;
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
  deleteTask: [];
  save: [];
  "update:defaultBillableForTimeEntries": [value: boolean];
  "update:projectId": [value: string | null];
  "update:status": [value: TaskStatus];
  "update:title": [value: string];
}>();

const statusOptions = [
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
] satisfies { label: string; value: TaskStatus }[];

const selectedProjectName = computed(() => {
  return props.projects.find((project) => project.id === props.projectId)?.name ?? "";
});
const selectedProject = computed(() =>
  props.projects.find((project) => project.id === props.projectId) ?? null,
);
const projectSearchValue = shallowRef<string | null>(null);
const projectSearchQuery = shallowRef("");
const projectSuggestions = computed(() => {
  return filterAutocompleteOptions(
    props.projects,
    projectSearchQuery.value,
    (project) => project.name,
  );
});

const projectModel = computed({
  get: () => projectSearchValue.value ?? selectedProject.value,
  set: (value: ProjectResponse | string | null | undefined) => {
    if (typeof value === "string") {
      projectSearchValue.value = value;
      projectSearchQuery.value = value;
      return;
    }

    projectSearchValue.value = null;
    projectSearchQuery.value = "";
    emit("update:projectId", value?.id ?? null);
  },
});

const statusModel = computed({
  get: () => props.status,
  set: (value: TaskStatus | null | undefined) => {
    emit("update:status", value ?? "open");
  },
});

const titleModel = computed({
  get: () => props.valueTitle,
  set: (value: string) => {
    emit("update:title", value);
  },
});

const defaultBillableModel = computed({
  get: () => props.defaultBillableForTimeEntries,
  set: (value: boolean) => {
    emit("update:defaultBillableForTimeEntries", value);
  },
});

const isDialogMutating = computed(() => props.isSaving || props.isDeleting);

watch(
  [() => props.isOpen, () => props.mode, () => props.projectId],
  () => {
    projectSearchValue.value = null;
    projectSearchQuery.value = "";
  },
);

function handleProjectComplete(event: { query: string }): void {
  projectSearchQuery.value = event.query;
}
</script>

<template>
  <Dialog
    :closable="!isDialogMutating"
    modal
    :dismissable-mask="!isDialogMutating"
    :draggable="false"
    :pt="{
      root: 'w-[min(480px,calc(100vw-2rem))] rounded-lg border border-divider',
      header: 'px-6 pt-6 pb-0',
      content: 'px-6 pb-6 pt-4',
      footer: 'px-6 pb-6 pt-0',
    }"
    :visible="props.isOpen"
    @update:visible="(nextVisible) => {
      if (!nextVisible && !isDialogMutating) {
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
      <InlineRequestMessage
        v-if="props.requestErrorMessage"
        :message="props.requestErrorMessage"
        :title="props.mode === 'edit' ? 'Could not update this task.' : 'Could not create this task.'"
      />

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
          append-to="self"
          complete-on-focus
          data-key="id"
          dropdown
          dropdown-mode="blank"
          fluid
          force-selection
          input-id="project-task-project"
          :min-length="0"
          option-label="name"
          placeholder="Select project"
          :disabled="isDialogMutating"
          :invalid="!!props.errors.projectId"
          :suggestions="projectSuggestions"
          @complete="handleProjectComplete"
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
          :disabled="isDialogMutating"
          :invalid="!!props.errors.title"
        />
        <small
          v-if="props.errors.title"
          class="text-destructive text-xs"
        >
          {{ props.errors.title }}
        </small>
      </div>

      <div
        v-if="props.mode === 'edit'"
        class="flex flex-col gap-1"
      >
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
          :disabled="isDialogMutating"
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

      <div class="flex flex-col gap-1">
        <span class="text-text-dark text-[13px] font-medium">
          Default billable for time entries
        </span>
        <label
          for="project-task-default-billable"
          class="border-divider bg-surface-primary flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[6px] border px-3"
        >
          <Checkbox
            id="project-task-default-billable"
            v-model="defaultBillableModel"
            binary
            :disabled="isDialogMutating"
          />
          <span class="text-text-dark text-sm font-medium">
            Billable by default
          </span>
        </label>
        <small class="text-text-muted text-xs">
          New time entries for this task inherit this value.
        </small>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          v-if="props.mode === 'edit'"
          type="button"
          label="Delete task"
          severity="danger"
          variant="outlined"
          :disabled="isDialogMutating"
          :loading="props.isDeleting"
          @click="emit('deleteTask')"
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
