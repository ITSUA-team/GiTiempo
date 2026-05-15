<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import type { ProjectResponse, TaskStatus } from "@gitiempo/shared";
import { computed } from "vue";

const props = defineProps<{
  errors: {
    projectId: string | null;
    status: string | null;
    title: string | null;
  };
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
  save: [];
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

const projectModel = computed({
  get: () => props.projectId,
  set: (value: string | null | undefined) => {
    emit("update:projectId", value ?? null);
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
          class="border-divider bg-surface text-text-dark flex h-[38px] items-center rounded-md border px-3 text-sm"
          role="textbox"
          aria-readonly="true"
        >
          {{ selectedProjectName }}
        </div>
        <Select
          v-else
          v-model="projectModel"
          filter
          fluid
          input-id="project-task-project"
          option-label="name"
          option-value="id"
          placeholder="Select project"
          :disabled="props.isSaving"
          :invalid="!!props.errors.projectId"
          :options="props.projects"
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
