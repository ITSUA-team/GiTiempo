<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import type { ProjectResponse } from "@gitiempo/shared";
import { computed } from "vue";

import type { TaskLookupOption } from "@/composables/useTimeEntriesPage";

const props = defineProps<{
  dialogErrorMessage: string | null;
  endedAt: Date | null;
  errors: {
    description: string | null;
    endedAt: string | null;
    projectId: string | null;
    startedAt: string | null;
    taskId: string | null;
  };
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isOpen: boolean;
  isSaving: boolean;
  mode: "create" | "edit" | null;
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
  save: [];
  taskSearch: [query: string];
  "update:description": [value: string];
  "update:endedAt": [value: Date | null];
  "update:isBillable": [value: boolean];
  "update:projectId": [value: string | null];
  "update:startedAt": [value: Date | null];
  "update:taskValue": [value: string | TaskLookupOption | null];
}>();

const projectModel = computed({
  get: () => props.projectId,
  set: (value: string | null | undefined) => {
    emit("update:projectId", value ?? null);
  },
});

const taskModel = computed({
  get: () => props.taskValue,
  set: (value: string | TaskLookupOption | null | undefined) => {
    emit("update:taskValue", value ?? null);
  },
});

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

function handleTaskComplete(event: { query: string }): void {
  emit("taskSearch", event.query);
}
</script>

<template>
  <Dialog
    modal
    :dismissable-mask="true"
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
        v-if="props.dialogErrorMessage"
        class="border-destructive/20 bg-destructive/5 rounded-lg border p-3"
      >
        <p class="text-destructive text-sm font-medium">
          {{ props.mode === 'edit' ? 'Could not update this entry.' : 'Could not create this entry.' }}
        </p>
        <p class="text-destructive mt-1 text-xs">
          {{ props.dialogErrorMessage }}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="time-entry-project"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <Select
          v-model="projectModel"
          filter
          fluid
          input-id="time-entry-project"
          option-label="name"
          option-value="id"
          :disabled="props.isLoadingProjects || props.isSaving"
          :invalid="!!props.errors.projectId"
          :loading="props.isLoadingProjects"
          :options="props.projects"
          placeholder="Select a project"
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
          v-model="taskModel"
          complete-on-focus
          dropdown
          dropdown-mode="blank"
          fluid
          force-selection
          input-id="time-entry-task"
          :min-length="0"
          option-label="title"
          :disabled="!props.projectId || props.isLoadingTasks || props.isSaving"
          :invalid="!!props.errors.taskId"
          :loading="props.isLoadingTasks"
          :suggestions="props.taskSuggestions"
          placeholder="Search tasks"
          @complete="handleTaskComplete"
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
            hour-format="24"
            input-id="time-entry-started-at"
            :disabled="props.isSaving"
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
            hour-format="24"
            input-id="time-entry-ended-at"
            :disabled="props.isSaving"
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
          :disabled="props.isSaving"
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

      <label
        for="time-entry-billable"
        class="border-divider bg-surface flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2"
      >
        <Checkbox
          id="time-entry-billable"
          v-model="billableModel"
          binary
          :disabled="props.isSaving"
        />
        <span class="text-text-dark text-sm font-medium">
          Billable entry
        </span>
      </label>
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
