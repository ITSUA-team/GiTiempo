<script setup lang="ts">
import AutoComplete from "primevue/autocomplete";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import Skeleton from "primevue/skeleton";
import { SurfaceCard } from "@gitiempo/web-shared";

import PageHeader from "@/components/layout/PageHeader.vue";
import ProjectTaskDialog from "@/components/projects/ProjectTaskDialog.vue";
import ProjectsTaskSection from "@/components/projects/ProjectsTaskSection.vue";
import {
  useProjectsPage,
  type ProjectsSearchSuggestion,
} from "@/composables/useProjectsPage";

const {
  canCreateTasks,
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
  filteredProjectGroups,
  formatUpdatedLabel,
  handleSearchComplete,
  isDeletingTaskId,
  isDialogOpen,
  isSavingDialog,
  openCreateDialog,
  openEditDialog,
  pageState,
  requestDeleteTask,
  requestErrorMessage,
  retryLoadPage,
  saveDialog,
  searchSuggestions,
  selectedSearchValue,
  setDialogProjectId,
  setDialogTaskStatus,
  setDialogTaskTitle,
  setSearchValue,
  visibleProjects,
} = useProjectsPage();
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <ConfirmDialog />

    <template v-if="pageState === 'loading'">
      <div class="flex items-center justify-between gap-4">
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
        <Skeleton
          width="7.5rem"
          height="2.5rem"
        />
      </div>

      <div class="flex max-w-[360px] flex-col gap-1.5">
        <Skeleton
          width="4rem"
          height="1rem"
        />
        <Skeleton
          width="100%"
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

          <div class="border-divider bg-surface flex flex-col rounded-lg border">
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
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          subtitle="Create, update, and organize tasks across your visible projects."
          title="Projects"
        />

        <Button
          data-testid="projects-header-create"
          label="+ New task"
          :disabled="!canCreateTasks"
          @click="openCreateDialog()"
        />
      </div>

      <div class="flex max-w-[360px] flex-col gap-1.5">
        <label
          for="projects-search"
          class="text-text-dark text-[13px] font-medium"
        >
          Search
        </label>
        <AutoComplete
          input-id="projects-search"
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
        />
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
            Clear the search or create a new task in one of your visible projects.
          </p>
        </div>
        <Button
          label="+ New task"
          :disabled="!canCreateTasks"
          @click="openCreateDialog()"
        />
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
          :is-deleting-task-id="isDeletingTaskId"
          :project="group.project"
          :tasks="group.tasks"
          @add-task="openCreateDialog"
          @delete-task="requestDeleteTask"
          @edit-task="openEditDialog"
        />
      </div>
    </template>

    <ProjectTaskDialog
      :errors="dialogErrors"
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
      @save="void saveDialog()"
      @update:project-id="setDialogProjectId"
      @update:status="setDialogTaskStatus"
      @update:title="setDialogTaskTitle"
    />
  </section>
</template>
