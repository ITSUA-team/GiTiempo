<script setup lang="ts">
import type { ProjectResponse } from "@gitiempo/shared";

import TimeEntryDialog from "@/components/time-entries/TimeEntryDialog.vue";
import type { useTimeEntryDialog } from "@/composables/time-entries/useTimeEntryDialog";
import type { useTimeEntryDialogWorkflow } from "@/composables/time-entries/useTimeEntryDialogWorkflow";

const props = defineProps<{
  dialog: ReturnType<typeof useTimeEntryDialog>;
  workflow: ReturnType<typeof useTimeEntryDialogWorkflow>;
  isLoadingProjects: boolean;
  projects: ProjectResponse[];
  projectsErrorMessage: string | null;
}>();

const emit = defineEmits<{
  deleteEntry: [];
}>();
</script>

<template>
  <TimeEntryDialog
    :can-create-task="props.workflow.canCreateDialogTask.value"
    :dialog-error-message="props.dialog.dialogRequestErrorMessage.value"
    :ended-at="props.dialog.dialogEndedAt.value"
    :errors="props.dialog.dialogErrors.value"
    :is-deleting="props.workflow.isDeletingDialogEntry.value"
    :is-loading-projects="props.isLoadingProjects"
    :is-loading-tasks="props.dialog.isLoadingDialogTasks.value"
    :is-open="props.dialog.isDialogOpen.value"
    :is-reconciling-target="props.workflow.isReconcilingDialogTarget.value"
    :is-saving="props.workflow.isSavingDialogFlow.value"
    :mode="props.dialog.dialogMode.value"
    :new-task-title="props.dialog.dialogNewTaskTitle.value"
    :project-id="props.dialog.dialogProjectId.value"
    :projects="props.projects"
    :projects-error-message="props.projectsErrorMessage"
    :save-label="props.dialog.dialogSaveLabel.value"
    :started-at="props.dialog.dialogStartedAt.value"
    :subtitle="props.dialog.dialogSubtitle.value"
    :task-suggestions="props.dialog.dialogTaskSuggestions.value"
    :task-value="props.dialog.dialogTaskValue.value"
    :tasks-error-message="props.dialog.dialogTasksErrorMessage.value"
    :title="props.dialog.dialogTitle.value"
    :value-description="props.dialog.dialogDescription.value"
    :value-is-billable="props.dialog.dialogIsBillable.value"
    @close="props.dialog.closeDialog"
    @delete-entry="emit('deleteEntry')"
    @save="void props.workflow.saveDialog()"
    @task-search="props.workflow.handleDialogTaskSearch"
    @update:description="props.dialog.setDescription"
    @update:ended-at="props.dialog.setEndedAt"
    @update:is-billable="props.dialog.setIsBillable"
    @update:new-task-title="props.dialog.setNewTaskTitle"
    @update:project-id="(value) => void props.workflow.setDialogProjectId(value)"
    @update:started-at="props.dialog.setStartedAt"
    @update:task-value="props.workflow.setDialogTaskValue"
  />
</template>
