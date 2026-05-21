<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { computed } from "vue";

const props = defineProps<{
  createTaskErrorMessage: string | null;
  createTaskTitle: string;
  isConfirmSelectionDisabled: boolean;
  isCreateTaskDisabled: boolean;
  isCreatingTask: boolean;
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isOpen: boolean;
  projectOptions: ProjectResponse[];
  projectsErrorMessage: string | null;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  taskOptions: TaskResponse[];
  tasksErrorMessage: string | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
  createTask: [];
  "update:createTaskTitle": [value: string];
  "update:selectedProjectId": [value: string | null];
  "update:selectedTaskId": [value: string | null];
}>();

const selectedProjectModel = computed({
  get: () => props.selectedProjectId,
  set: (value: string | null | undefined) => {
    emit("update:selectedProjectId", value ?? null);
  },
});

const selectedTaskModel = computed({
  get: () => props.selectedTaskId,
  set: (value: string | null | undefined) => {
    emit("update:selectedTaskId", value ?? null);
  },
});

const createTaskTitleModel = computed({
  get: () => props.createTaskTitle,
  set: (value: string) => {
    emit("update:createTaskTitle", value);
  },
});
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
          Change timer task
        </h2>
        <p class="text-text-muted text-[13px]">
          Select a visible project and task, or create a new task inside the selected project.
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

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-project"
          class="text-text-dark text-[13px] font-medium"
        >
          Project
        </label>
        <Select
          v-model="selectedProjectModel"
          filter
          fluid
          input-id="top-bar-timer-project"
          option-label="name"
          option-value="id"
          :disabled="props.isLoadingProjects"
          :loading="props.isLoadingProjects"
          :options="props.projectOptions"
          placeholder="Select a project"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="top-bar-timer-task"
          class="text-text-dark text-[13px] font-medium"
        >
          Task
        </label>
        <Select
          v-model="selectedTaskModel"
          filter
          fluid
          input-id="top-bar-timer-task"
          option-label="title"
          option-value="id"
          :disabled="!props.selectedProjectId || props.isLoadingTasks"
          :loading="props.isLoadingTasks"
          :options="props.taskOptions"
          placeholder="Select a task"
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
              :disabled="!props.selectedProjectId || props.isCreatingTask"
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
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid="top-bar-timer-create-task-actions"
          >
            <p class="text-text-muted text-xs">
              {{ props.selectedProjectId ? 'The new task is created in the selected project only.' : 'Select a project first.' }}
            </p>
            <Button
              type="button"
              class="w-full sm:w-auto"
              severity="secondary"
              :disabled="props.isCreateTaskDisabled"
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
        class="flex flex-col gap-2 sm:flex-row sm:justify-end"
        data-testid="top-bar-timer-task-dialog-footer"
      >
        <Button
          type="button"
          class="w-full sm:w-auto"
          label="Cancel"
          severity="secondary"
          text
          @click="emit('close')"
        />
        <Button
          type="button"
          class="w-full sm:w-auto"
          :disabled="props.isConfirmSelectionDisabled"
          label="Use selected task"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </Dialog>
</template>
