<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import type { ProjectMember } from "@gitiempo/shared";
import { computed, watch } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import {
  createAppConfirm,
  createAppToast,
  SurfaceCard,
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
  dialogProjectId,
  dialogRequestErrorMessage,
  dialogSaveLabel,
  dialogSubtitle,
  dialogTaskAssigneeIds,
  dialogTaskDescription,
  dialogTaskPriority,
  dialogTaskStatus,
  dialogTaskTitle,
  dialogTitle,
  isDialogOpen,
  openCreateDialog,
  openEditDialog,
  setDialogTaskAssigneeIds,
  setDialogTaskDescription,
  setDialogTaskPriority,
  setDialogProjectId,
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
const dialogAssigneeOptions = computed(() => {
  const selectedProject = visibleProjects.value.find(
    (project) => project.id === dialogProjectId.value,
  );

  return (selectedProject?.members ?? [])
    .map((member) => ({
      label: getProjectMemberLabel(member),
      value: member.userId,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
});
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

watch(dialogAssigneeOptions, (options) => {
  const availableIds = new Set(options.map((option) => option.value));
  const validAssigneeIds = dialogTaskAssigneeIds.value.filter((id) =>
    availableIds.has(id),
  );

  if (validAssigneeIds.length !== dialogTaskAssigneeIds.value.length) {
    setDialogTaskAssigneeIds(validAssigneeIds);
  }
});

function getProjectMemberLabel(member: ProjectMember): string {
  return member.displayName ?? member.email;
}

async function saveDialog(): Promise<void> {
  const validInput = dialog.validateDialog();

  if (!validInput) {
    return;
  }

  dialog.setDialogRequestError(null);
  const errorMessage = await mutations.saveTask(
    validInput,
    dialog.editingTask.value,
  );

  if (errorMessage) {
    dialog.setDialogRequestError(errorMessage);
    return;
  }

  dialog.closeDialog();
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

      <SurfaceCard
        v-if="pageState === 'request-error'"
        border
        body-class="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
        data-testid="projects-request-error"
      >
        <div class="flex flex-col gap-1">
          <h2 class="text-text-dark text-lg font-semibold">
            Could not load projects
          </h2>
          <p class="text-text-muted text-sm">
            {{ requestErrorMessage }}
          </p>
        </div>
        <Button
          label="Retry"
          severity="secondary"
          variant="outlined"
          @click="void retryLoadPage()"
        />
      </SurfaceCard>

      <SurfaceCard
        v-else-if="pageState === 'empty'"
        border
        body-class="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
        data-testid="projects-empty-state"
      >
        <div class="flex flex-col gap-1">
          <h2 class="text-text-dark text-lg font-semibold">
            No projects or tasks match this view
          </h2>
          <p class="text-text-muted text-sm">
            Clear the filters to restore visible project sections.
          </p>
        </div>
      </SurfaceCard>

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
          @add-task="openCreateDialog"
          @edit-task="openEditDialog"
        />
      </div>
    </template>

    <ProjectTaskDialog
      :assignee-ids="dialogTaskAssigneeIds"
      :assignee-options="dialogAssigneeOptions"
      :description="dialogTaskDescription"
      :errors="dialogErrors"
      :is-deleting="isDeletingDialogTask"
      :is-open="isDialogOpen"
      :is-saving="isSavingDialog"
      :mode="dialogMode"
      :priority="dialogTaskPriority"
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
      @update:assignee-ids="setDialogTaskAssigneeIds"
      @update:description="setDialogTaskDescription"
      @update:priority="setDialogTaskPriority"
      @update:project-id="setDialogProjectId"
      @update:status="setDialogTaskStatus"
      @update:title="setDialogTaskTitle"
    />
  </section>
</template>
