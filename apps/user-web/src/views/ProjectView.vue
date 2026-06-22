<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { computed, ref } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import {
  BillableDefaultBackfillDialog,
  createAppConfirm,
  createAppToast,
  RequestStateCard,
} from "@gitiempo/web-shared";

import ProjectTaskDialog from "@/components/projects/ProjectTaskDialog.vue";
import ProjectsTaskSection from "@/components/projects/ProjectsTaskSection.vue";
import { useProjectsData } from "@/composables/projects/useProjectsData";
import { useProjectsSearch } from "@/composables/projects/useProjectsSearch";
import { useProjectTaskDialog } from "@/composables/projects/useProjectTaskDialog";
import { useProjectTaskMutations } from "@/composables/projects/useProjectTaskMutations";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { resolveDataPageState } from "@/lib/page-state";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import {
  formatUpdatedLabel,
  type ProjectStatusFilterOption,
  type ProjectUpdatedFilterOption,
  type ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const client = createDefaultTimeEntriesClient();
const confirm = useConfirm();
const toast = useToast();
const appConfirm = createAppConfirm(confirm);
const appToast = createAppToast(toast);
const accessToken = computed(() => authStore.accessToken);
const scope = computed(() => getUserServerStateScope(authStore.accessToken));
const data = useProjectsData({
  accessToken,
  client,
  onLoadProjectsError(error) {
    appToast.showErrorToast({
      detail: "Please try again.",
      error,
      logContext: { action: "load-projects", feature: "projects-page" },
      summary: "Could not load visible projects",
    });
  },
  onLoadTasksError(message) {
    appToast.showErrorToast({
      detail: "Please try again.",
      error: new Error(message),
      logContext: { action: "load-project-tasks", feature: "projects-page" },
      summary: "Could not load project tasks",
    });
  },
  scope,
});
const search = useProjectsSearch(data.visibleProjects, data.tasksByProjectId);
const dialog = useProjectTaskDialog();
const mutations = useProjectTaskMutations({
  accessToken,
  client,
  onTaskDeleted: data.removeTask,
  onTaskSaved: data.upsertTask,
  scope,
  toast,
});
const {
  closeDialog,
  dialogErrors,
  dialogMode,
  dialogDefaultBillableForTimeEntries,
  dialogProjectId,
  dialogRequestErrorMessage,
  dialogSaveLabel,
  dialogSubtitle,
  dialogTaskStatus,
  dialogTaskTitle,
  dialogTitle,
  isDialogOpen,
  openEditDialog,
  setDialogDefaultBillableForTimeEntries,
  setDialogProjectId: setDialogProjectIdValue,
  setDialogTaskStatus,
  setDialogTaskTitle,
} = dialog;
const {
  filteredProjectGroups,
  handleSearchComplete,
  searchSuggestions,
  selectedSearchValue,
  selectedStatusFilter,
  selectedUpdatedFilter,
  setSearchValue,
  setStatusFilterValue,
  setUpdatedFilterValue,
  statusFilterOptions,
  updatedFilterOptions,
} = search;
const { isDeletingTaskId, isSavingDialog } = mutations;
const { requestErrorMessage, visibleProjects } = data;
const submittingTaskBackfill = ref(false);
const taskBackfillDialog = ref<{
  taskId: string;
  taskTitle: string;
  updateTimeEntries: boolean;
} | null>(null);
const isDeletingDialogTask = computed(() => {
  const task = dialog.editingTask.value;

  return !!task && isDeletingTaskId.value === task.id;
});
const pageState = computed(() =>
  resolveDataPageState({
    hasRequestError: data.requestErrorMessage.value !== null,
    isEmpty: search.filteredProjectGroups.value.length === 0,
    isLoading: data.isLoadingProjects.value || data.isLoadingTasks.value,
  }),
);

function getProjectDefaultBillable(projectId: string | null): boolean {
  return (
    visibleProjects.value.find((project) => project.id === projectId)
      ?.defaultBillableForTasks ?? true
  );
}

function openTaskCreateDialog(projectId: string | null = null): void {
  dialog.openCreateDialog(projectId, getProjectDefaultBillable(projectId));
}

function setDialogProjectId(value: string | null): void {
  setDialogProjectIdValue(value);

  if (dialog.dialogMode.value === "create") {
    dialog.setDialogDefaultBillableForTimeEntries(
      getProjectDefaultBillable(value),
    );
  }
}

async function openTaskBackfillDialogIfNeeded(
  task: { id: string; projectId: string; title: string },
): Promise<void> {
  try {
    const entries = await client.listProjectTimeEntries(task.projectId, {
      limit: 1,
      taskId: task.id,
    });

    if (entries.meta.total === 0) {
      return;
    }

    taskBackfillDialog.value = {
      taskId: task.id,
      taskTitle: task.title,
      updateTimeEntries: true,
    };
  } catch (error) {
    appToast.showErrorToast({
      detail: "The task default was saved for future entries.",
      error,
      logContext: { action: "check-task-backfill", feature: "projects-page" },
      summary: "Could not check existing time entries",
    });
  }
}

function closeTaskBackfillDialog(): void {
  if (submittingTaskBackfill.value) {
    return;
  }

  taskBackfillDialog.value = null;
}

async function handleTaskBackfillSubmitted(): Promise<void> {
  const dialogState = taskBackfillDialog.value;

  if (!dialogState) {
    return;
  }

  submittingTaskBackfill.value = true;

  try {
    const result = await client.backfillTaskBillableDefault(dialogState.taskId, {
      updateTimeEntries: true,
    });

    appToast.showSuccessToast(
      "Existing time entries updated",
      `${result.timeEntriesUpdated} existing ${result.timeEntriesUpdated === 1 ? "entry has" : "entries have"} been updated.`,
    );
    taskBackfillDialog.value = null;
  } catch (error) {
    appToast.showErrorToast({
      detail: "Please try again.",
      error,
      logContext: { action: "backfill-task-default", feature: "projects-page" },
      summary: "Could not update existing time entries",
    });
  } finally {
    submittingTaskBackfill.value = false;
  }
}

async function saveDialog(): Promise<void> {
  const validInput = dialog.validateDialog();

  if (!validInput) {
    return;
  }

  const editingTask = dialog.editingTask.value;
  const shouldPromptForBackfill =
    validInput.mode === "edit" &&
    editingTask !== null &&
    validInput.input.defaultBillableForTimeEntries !==
      editingTask.defaultBillableForTimeEntries;
  const backfillTask = editingTask
    ? {
        id: editingTask.id,
        projectId: editingTask.projectId,
        title: validInput.input.title ?? editingTask.title,
      }
    : null;

  dialog.setDialogRequestError(null);
  const errorMessage = await mutations.saveTask(validInput, dialog.editingTask.value);

  if (errorMessage) {
    dialog.setDialogRequestError(errorMessage);
    return;
  }

  dialog.closeDialog();

  if (shouldPromptForBackfill && backfillTask) {
    await openTaskBackfillDialogIfNeeded(backfillTask);
  }
}

function requestDeleteTask(
  task: Parameters<typeof mutations.deleteTask>[0],
  options: { closeDialogOnSuccess?: boolean } = {},
): void {
  appConfirm.confirmDestructive({
    accept: async () => {
      const wasDeleted = await mutations.deleteTask(task);

      if (
        wasDeleted &&
        options.closeDialogOnSuccess === true &&
        dialog.editingTask.value?.id === task.id
      ) {
        dialog.closeDialog();
      }
    },
    acceptLabel: "Delete",
    header: "Delete task?",
    message: "This task will be permanently deleted.",
  });
}

function requestDeleteDialogTask(): void {
  const task = dialog.editingTask.value;

  if (!task || dialog.dialogMode.value !== "edit") {
    return;
  }

  requestDeleteTask(task, { closeDialogOnSuccess: true });
}

async function retryLoadPage(): Promise<void> {
  await data.loadPage();
}

</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <template v-if="pageState === 'loading'">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Skeleton
          width="22.5rem"
          height="1rem"
        />
        <Skeleton
          width="11.25rem"
          height="1rem"
        />
        <Skeleton
          width="11.25rem"
          height="1rem"
        />
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Skeleton
          width="22.5rem"
          height="2.75rem"
        />
        <Skeleton
          width="11.25rem"
          height="2.75rem"
        />
        <Skeleton
          width="11.25rem"
          height="2.75rem"
        />
      </div>

      <div class="flex flex-col gap-5">
        <div
          v-for="index in 2"
          :key="index"
          class="flex flex-col gap-2.5"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col gap-2">
              <Skeleton
                width="10rem"
                height="1.25rem"
              />
              <Skeleton
                width="6rem"
                height="0.875rem"
              />
            </div>
            <Skeleton
              width="6.5rem"
              height="2rem"
            />
          </div>

          <div class="border-divider bg-surface-primary flex flex-col rounded-lg border">
            <Skeleton
              width="100%"
              height="2.75rem"
            />
            <Skeleton
              width="100%"
              height="3.25rem"
            />
            <Skeleton
              width="100%"
              height="3.25rem"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        data-testid="projects-filters"
      >
        <div class="flex w-full flex-col gap-1.5 sm:w-[360px]">
          <label
            for="projects-search"
            class="text-text-dark text-[13px] font-medium"
          >
            Search
          </label>
          <AutoComplete
            data-testid="projects-search-filter"
            input-id="projects-search"
            class="w-full"
            option-label="label"
            placeholder="Search projects or tasks"
            :model-value="selectedSearchValue"
            :suggestions="searchSuggestions"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            fluid
            :min-length="0"
            @complete="handleSearchComplete($event.query)"
            @update:model-value="setSearchValue(($event ?? null) as ProjectsSearchSuggestion | string | null)"
          >
            <template #option="slotProps">
              <div class="flex flex-col gap-0.5">
                <span
                  class="text-text-dark text-sm"
                  :class="slotProps.option.kind === 'project' ? 'font-semibold' : 'font-normal'"
                >
                  {{ slotProps.option.label }}
                </span>
                <span class="text-text-muted text-xs">
                  {{ slotProps.option.meta }}
                </span>
              </div>
            </template>
          </AutoComplete>
        </div>

        <div class="flex w-full flex-col gap-1.5 sm:w-[180px]">
          <label
            for="projects-status-filter"
            class="text-text-dark text-[13px] font-medium"
          >
            Status
          </label>
          <Select
            data-testid="projects-status-filter"
            input-id="projects-status-filter"
            class="w-full"
            option-label="label"
            placeholder="All statuses"
            :model-value="selectedStatusFilter"
            fluid
            :options="statusFilterOptions"
            @update:model-value="setStatusFilterValue(($event ?? null) as ProjectStatusFilterOption | null)"
          />
        </div>

        <div class="flex w-full flex-col gap-1.5 sm:w-[180px]">
          <label
            for="projects-updated-filter"
            class="text-text-dark text-[13px] font-medium"
          >
            Updated
          </label>
          <Select
            data-testid="projects-updated-filter"
            input-id="projects-updated-filter"
            class="w-full"
            option-label="label"
            placeholder="Any time"
            :model-value="selectedUpdatedFilter"
            fluid
            :options="updatedFilterOptions"
            @update:model-value="setUpdatedFilterValue(($event ?? null) as ProjectUpdatedFilterOption | null)"
          />
        </div>
      </div>

      <RequestStateCard
        v-if="pageState === 'request-error'"
        border
        data-testid="projects-request-error"
        :description="requestErrorMessage"
        retry-label="Retry"
        title="Could not load projects"
        @retry="void retryLoadPage()"
      />

      <RequestStateCard
        v-else-if="pageState === 'empty'"
        border
        data-testid="projects-empty-state"
        description="Clear the filters to restore visible project sections."
        title="No projects or tasks match this view"
      />

      <div
        v-else
        class="flex flex-col gap-5"
        data-testid="projects-groups"
      >
        <ProjectsTaskSection
          v-for="group in filteredProjectGroups"
          :key="group.project.id"
          :format-updated-label="formatUpdatedLabel"
          :project="group.project"
          :tasks="group.tasks"
          @add-task="openTaskCreateDialog"
          @edit-task="openEditDialog"
        />
      </div>
    </template>

    <ProjectTaskDialog
      :errors="dialogErrors"
      :default-billable-for-time-entries="dialogDefaultBillableForTimeEntries"
      :is-deleting="isDeletingDialogTask"
      :is-open="isDialogOpen"
      :is-saving="isSavingDialog"
      :mode="dialogMode"
      :project-id="dialogProjectId"
      :projects="visibleProjects"
      :request-error-message="dialogRequestErrorMessage"
      :save-label="dialogSaveLabel"
      :status="dialogTaskStatus"
      :subtitle="dialogSubtitle"
      :title="dialogTitle"
      :value-title="dialogTaskTitle"
      @close="closeDialog"
      @delete-task="requestDeleteDialogTask"
      @save="void saveDialog()"
      @update:default-billable-for-time-entries="setDialogDefaultBillableForTimeEntries"
      @update:project-id="setDialogProjectId"
      @update:status="setDialogTaskStatus"
      @update:title="setDialogTaskTitle"
    />
    <BillableDefaultBackfillDialog
      v-if="taskBackfillDialog"
      v-model:update-time-entries="taskBackfillDialog.updateTimeEntries"
      :entity-name="taskBackfillDialog.taskTitle"
      :has-time-entries="true"
      :is-open="true"
      :is-submitting="submittingTaskBackfill"
      variant="task"
      @close="closeTaskBackfillDialog"
      @submit="handleTaskBackfillSubmitted"
    />
  </section>
</template>
