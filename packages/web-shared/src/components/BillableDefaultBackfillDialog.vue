<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";

import AppDialog from "./AppDialog.vue";
import LabeledCheckbox from "./LabeledCheckbox.vue";

const props = defineProps<{
  entityName: string;
  hasTimeEntries: boolean;
  hasTasks?: boolean;
  isOpen: boolean;
  isSubmitting?: boolean;
  updateTasks?: boolean;
  updateTimeEntries: boolean;
  variant: "project" | "task";
}>();

const emit = defineEmits<{
  close: [];
  submit: [];
  "update:updateTasks": [value: boolean];
  "update:updateTimeEntries": [value: boolean];
}>();

const title = computed(() =>
  props.variant === "project"
    ? "Update project billable default?"
    : "Update task billable default?",
);
const description = computed(() => {
  if (props.variant === "project") {
    return `The new project default is already saved for future tasks. Choose whether to also update existing tasks and time entries in ${props.entityName}.`;
  }

  return `The new task default is already saved for future time entries. Choose whether to also update existing time entries for ${props.entityName}.`;
});
const canSubmit = computed(() =>
  props.variant === "project"
    ? props.updateTasks === true || props.updateTimeEntries === true
    : props.updateTimeEntries,
);
const tasksModel = computed({
  get: () => props.updateTasks === true,
  set: (value: boolean) => {
    emit("update:updateTasks", value);
  },
});
const timeEntriesModel = computed({
  get: () => props.updateTimeEntries,
  set: (value: boolean) => {
    emit("update:updateTimeEntries", value);
  },
});
</script>

<template>
  <AppDialog
    modal
    :closable="!props.isSubmitting"
    :dismissable-mask="!props.isSubmitting"
    :draggable="false"
    :pt="{
      root: 'w-[min(480px,calc(100vw-2rem))] rounded-lg border border-divider bg-surface-primary',
      header: 'px-[18px] pt-[18px] pb-0',
      content: 'px-[18px] pb-[18px] pt-3',
      footer: 'px-[18px] pb-[18px] pt-0',
    }"
    :visible="props.isOpen"
    @update:visible="(nextVisible: boolean) => {
      if (!nextVisible && !props.isSubmitting) {
        emit('close');
      }
    }"
  >
    <template #header>
      <h2 class="text-text-dark text-lg font-semibold">
        {{ title }}
      </h2>
    </template>

    <div class="flex flex-col gap-3">
      <p class="text-text-muted text-sm">
        {{ description }}
      </p>

      <div class="flex flex-col gap-2">
        <LabeledCheckbox
          v-if="props.variant === 'project' && props.hasTasks"
          v-model="tasksModel"
          input-id="billable-default-update-tasks"
          label="Update existing tasks in this project"
          :disabled="props.isSubmitting"
        />

        <LabeledCheckbox
          v-if="props.hasTimeEntries"
          v-model="timeEntriesModel"
          input-id="billable-default-update-time-entries"
          :label="props.variant === 'project'
            ? 'Update existing time entries in this project'
            : 'Update existing time entries for this task'"
          :disabled="props.isSubmitting"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button
          label="Update existing records"
          type="button"
          :disabled="!canSubmit || props.isSubmitting"
          :loading="props.isSubmitting"
          @click="emit('submit')"
        />
      </div>
    </template>
  </AppDialog>
</template>
