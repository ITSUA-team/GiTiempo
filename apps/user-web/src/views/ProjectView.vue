<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import Skeleton from "primevue/skeleton";
import { computed } from "vue";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import {
  createAppConfirm,
  createAppToast,
  SurfaceCard,
} from "@gitiempo/web-shared";

import PageHeader from "@/components/layout/PageHeader.vue";
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
  dialogTaskStatus,
  dialogTaskTitle,
  dialogTitle,
  editingTask,
  isDialogOpen,
  openCreateDialog,
  openEditDialog,
  setDialogProjectId,
  setDialogTaskStatus,
  setDialogTaskTitle,
} = dialog;
const {
  filteredProjectGroups,
  handleSearchComplete,
  handleStatusFilterComplete,
  handleUpdatedFilterComplete,
  searchSuggestions,
  selectedSearchValue,
  selectedStatusFilter,
  selectedUpdatedFilter,
  setSearchValue,
  setStatusFilterValue,
  setUpdatedFilterValue,
  statusFilterSuggestions,
  updatedFilterSuggestions,
} = search;
const { isDeletingTaskId, isSavingDialog } = mutations;
const { requestErrorMessage, visibleProjects } = data;
const pageState = computed(() =>
  resolveDataPageState({
    hasRequestError: data.requestErrorMessage.value !== null,
    isEmpty: search.filteredProjectGroups.value.length === 0,
    isLoading: data.isLoadingProjects.value || data.isLoadingTasks.value,
  }),
);
const isDeletingDialogTask = computed(
  () =>
    editingTask.value !== null && isDeletingTaskId.value === editingTask.value.id,
);
const filterAutoCompletePt = {
  dropdown: {
    class:
      "border-divider bg-surface-primary text-brand inline-flex h-[38px] w-[92px] shrink-0 cursor-pointer items-center justify-center rounded-r-[6px] border border-l-0 px-0 text-xs font-medium shadow-none after:content-['AutoComplete']",
  },
  dropdownIcon: { class: "hidden size-0", style: "display: none" },
  option: { class: "min-w-0 border-divider border-t px-3 py-2.5 first:border-t-0" },
  optionLabel: { class: "truncate" },
  pcInputText: {
    root: {
      class:
        "border-divider bg-surface-primary text-text-muted h-[38px] min-w-0 flex-1 rounded-l-[6px] border border-r-0 px-3 text-[14px] font-normal shadow-none placeholder:text-text-muted",
    },
  },
  root: { class: "max-w-full min-w-0" },
} as const;
async function saveDialog(): Promise<void> {
  const validInput = dialog.validateDialog();

  if (!validInput) {
    return;
  }

  dialog.setDialogRequestError(null);
  const errorMessage = await mutations.saveTask(validInput, dialog.editingTask.value);

  if (errorMessage) {
    dialog.setDialogRequestError(errorMessage);
    return;
  }

  dialog.closeDialog();
}

function requestDeleteTask(task: Parameters<typeof mutations.deleteTask>[0]): void {
  appConfirm.confirmDestructive({
    accept: async () => {
      await mutations.deleteTask(task);

      if (!mutations.lastMutationErrorMessage.value) {
        dialog.closeDialog();
      }
    },
    acceptLabel: "Delete",
    header: "Delete task?",
    message: "This task will be permanently deleted.",
  });
}

function requestDeleteEditingTask(): void {
  if (editingTask.value) {
    requestDeleteTask(editingTask.value);
  }
}

async function retryLoadPage(): Promise<void> {
  await data.loadPage();
}

</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <template v-if="pageState === 'loading'">
      <div class="flex flex-col gap-2">
        <Skeleton
          width="8rem"
          height="1.5rem"
        />
        <Skeleton
          width="18rem"
          height="1rem"
        />
      </div>

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
      <PageHeader
        subtitle="Create, update, and organize tasks across your visible projects."
        title="Projects"
      />

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
            option-label="label"
            placeholder="Search projects or tasks"
            :model-value="selectedSearchValue"
            :pt="filterAutoCompletePt"
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
                  :class="slotProps.option.kind === 'project' ? 'font-semibold' : 'font-medium'"
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
          <AutoComplete
            data-testid="projects-status-filter"
            input-id="projects-status-filter"
            option-label="label"
            placeholder="All statuses"
            :model-value="selectedStatusFilter"
            :pt="filterAutoCompletePt"
            :suggestions="statusFilterSuggestions"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            fluid
            force-selection
            :min-length="0"
            @click="handleStatusFilterComplete()"
            @complete="handleStatusFilterComplete()"
            @update:model-value="setStatusFilterValue(($event ?? null) as ProjectStatusFilterOption | string | null)"
          />
        </div>

        <div class="flex w-full flex-col gap-1.5 sm:w-[180px]">
          <label
            for="projects-updated-filter"
            class="text-text-dark text-[13px] font-medium"
          >
            Updated
          </label>
          <AutoComplete
            data-testid="projects-updated-filter"
            input-id="projects-updated-filter"
            option-label="label"
            placeholder="Any time"
            :model-value="selectedUpdatedFilter"
            :pt="filterAutoCompletePt"
            :suggestions="updatedFilterSuggestions"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            fluid
            force-selection
            :min-length="0"
            @click="handleUpdatedFilterComplete()"
            @complete="handleUpdatedFilterComplete()"
            @update:model-value="setUpdatedFilterValue(($event ?? null) as ProjectUpdatedFilterOption | string | null)"
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
      :errors="dialogErrors"
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
      @delete="requestDeleteEditingTask"
      @save="void saveDialog()"
      @update:project-id="setDialogProjectId"
      @update:status="setDialogTaskStatus"
      @update:title="setDialogTaskTitle"
    />
  </section>
</template>
