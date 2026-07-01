<script setup lang="ts">
import { computed } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import {
  BillableDefaultBackfillDialog,
  createAppToast,
  RequestStateCard,
} from "@gitiempo/web-shared";

import ProjectTaskDialog from "@/components/projects/ProjectTaskDialog.vue";
import ProjectsFilters from "@/components/projects/ProjectsFilters.vue";
import ProjectsLoadingSkeleton from "@/components/projects/ProjectsLoadingSkeleton.vue";
import ProjectsTaskSection from "@/components/projects/ProjectsTaskSection.vue";
import { useProjectTaskActions } from "@/composables/projects/useProjectTaskActions";
import { useProjectTaskBackfillFlow } from "@/composables/projects/useProjectTaskBackfillFlow";
import { useProjectsData } from "@/composables/projects/useProjectsData";
import { useProjectsSearch } from "@/composables/projects/useProjectsSearch";
import { useProjectTaskDialog } from "@/composables/projects/useProjectTaskDialog";
import { useProjectTaskMutations } from "@/composables/projects/useProjectTaskMutations";
import { createDefaultTimeEntriesClient } from "@/config/clients";
import { resolveDataPageState } from "@/lib/page-state";
import { getUserServerStateScope } from "@/lib/server-state-scope";
import { formatUpdatedLabel } from "@/lib/projects-page-helpers";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const client = createDefaultTimeEntriesClient();
const confirm = useConfirm();
const toast = useToast();
const appToast = createAppToast(toast);
const isAuthenticated = computed(() => Boolean(authStore.accessToken));
const scope = computed(() => getUserServerStateScope(authStore.accessToken));
const data = useProjectsData({
  client,
  enabled: isAuthenticated,
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
  client,
  onTaskDeleted: data.removeTask,
  onTaskSaved: data.upsertTask,
  scope,
  toast,
});
const taskBackfill = useProjectTaskBackfillFlow({ client, toast });
const taskActions = useProjectTaskActions({
  confirm,
  dialog,
  mutations,
  onTaskBillableDefaultChanged: taskBackfill.openTaskBackfillDialogIfNeeded,
  visibleProjects: data.visibleProjects,
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
const { isSavingDialog } = mutations;
const { requestErrorMessage, visibleProjects } = data;
const {
  closeTaskBackfillDialog,
  handleTaskBackfillSubmitted,
  submittingTaskBackfill,
  taskBackfillDialog,
} = taskBackfill;
const {
  isDeletingDialogTask,
  openTaskCreateDialog,
  requestDeleteDialogTask,
  saveDialog,
  setDialogProjectId,
} = taskActions;
const pageState = computed(() =>
  resolveDataPageState({
    hasRequestError: data.requestErrorMessage.value !== null,
    isEmpty: search.filteredProjectGroups.value.length === 0,
    isLoading: data.isLoadingProjects.value || data.isLoadingTasks.value,
  }),
);

async function retryLoadPage(): Promise<void> {
  await data.loadPage();
}

</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <ProjectsLoadingSkeleton v-if="pageState === 'loading'" />

    <template v-else>
      <ProjectsFilters
        :search-suggestions="searchSuggestions"
        :search-value="selectedSearchValue"
        :status-filter="selectedStatusFilter"
        :status-filter-options="statusFilterOptions"
        :updated-filter="selectedUpdatedFilter"
        :updated-filter-options="updatedFilterOptions"
        @search-complete="handleSearchComplete"
        @update:search-value="setSearchValue"
        @update:status-filter="setStatusFilterValue"
        @update:updated-filter="setUpdatedFilterValue"
      />

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
