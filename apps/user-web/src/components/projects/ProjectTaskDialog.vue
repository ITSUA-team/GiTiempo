<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import type { ProjectResponse, TaskStatus } from "@gitiempo/shared";
import { computed, ref } from "vue";

const props = defineProps<{
  errors: {
    projectId: string | null;
    status: string | null;
    title: string | null;
  };
  isOpen: boolean;
  isDeleting: boolean;
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
  delete: [];
  save: [];
  "update:projectId": [value: string | null];
  "update:status": [value: TaskStatus];
  "update:title": [value: string];
}>();

const statusOptions = [
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
] satisfies { label: string; value: TaskStatus }[];
const projectSuggestions = ref<ProjectResponse[]>([]);
const statusSuggestions = ref([...statusOptions]);

const selectedProjectName = computed(() => {
  return props.projects.find((project) => project.id === props.projectId)?.name ?? "";
});

const projectModel = computed(
  () => props.projects.find((project) => project.id === props.projectId) ?? null,
);

const statusModel = computed(
  () => statusOptions.find((option) => option.value === props.status) ?? statusOptions[0],
);

const titleModel = computed({
  get: () => props.valueTitle,
  set: (value: string) => {
    emit("update:title", value);
  },
});

function handleProjectComplete(event: { query: string }): void {
  const normalizedQuery = event.query.trim().toLowerCase();

  projectSuggestions.value = normalizedQuery
    ? props.projects.filter((project) =>
        project.name.toLowerCase().includes(normalizedQuery),
      )
    : [...props.projects];
}

function handleProjectUpdate(value: ProjectResponse | string | null): void {
  if (typeof value === "string") {
    if (value.trim().length === 0) {
      emit("update:projectId", null);
    }

    return;
  }

  emit("update:projectId", value?.id ?? null);
}

function handleStatusComplete(event: { query: string }): void {
  const normalizedQuery = event.query.trim().toLowerCase();

  statusSuggestions.value = normalizedQuery
    ? statusOptions.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery),
      )
    : [...statusOptions];
}

function handleStatusUpdate(
  value: (typeof statusOptions)[number] | string | null,
): void {
  if (typeof value === "string") {
    return;
  }

  emit("update:status", value?.value ?? "open");
}
</script>

<template>
  <Dialog
    :closable="!props.isSaving && !props.isDeleting"
    modal
    :dismissable-mask="!props.isSaving && !props.isDeleting"
    :draggable="false"
    :pt="{
      root: 'w-[min(480px,calc(100vw-2rem))] rounded-lg border border-divider',
      header: 'px-6 pt-6 pb-0',
      content: 'px-6 pb-6 pt-4',
      footer: 'px-6 pb-6 pt-0',
    }"
    :visible="props.isOpen"
    @update:visible="(nextVisible) => {
      if (!nextVisible && !props.isSaving && !props.isDeleting) {
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
          fluid
          force-selection
          input-id="project-task-project"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          option-label="name"
          placeholder="Select project"
          :disabled="props.isSaving || props.isDeleting"
          :invalid="!!props.errors.projectId"
          :min-length="0"
          :model-value="projectModel"
          :suggestions="projectSuggestions"
          @complete="handleProjectComplete"
          @update:model-value="handleProjectUpdate(($event ?? null) as ProjectResponse | string | null)"
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
          :disabled="props.isSaving || props.isDeleting"
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
        <AutoComplete
          fluid
          force-selection
          input-id="project-task-status"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          option-label="label"
          :disabled="props.isSaving || props.isDeleting"
          :invalid="!!props.errors.status"
          :min-length="0"
          :model-value="statusModel"
          :suggestions="statusSuggestions"
          @complete="handleStatusComplete"
          @update:model-value="handleStatusUpdate(($event ?? null) as (typeof statusOptions)[number] | string | null)"
        />
        <small
          v-if="props.errors.status"
          class="text-destructive text-xs"
        >
          {{ props.errors.status }}
        </small>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-3">
        <Button
          v-if="props.mode === 'edit'"
          type="button"
          label="Delete"
          severity="danger"
          variant="outlined"
          :disabled="props.isSaving"
          :loading="props.isDeleting"
          @click="emit('delete')"
        />
        <span v-else />

        <div class="flex justify-end gap-2">
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            variant="outlined"
            :disabled="props.isSaving || props.isDeleting"
            @click="emit('close')"
          />
          <Button
            type="button"
            :label="props.saveLabel"
            :disabled="props.isDeleting"
            :loading="props.isSaving"
            @click="emit('save')"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>
