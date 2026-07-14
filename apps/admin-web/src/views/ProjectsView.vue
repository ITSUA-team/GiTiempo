<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { ProjectResponse } from '@gitiempo/shared';
import {
  BillableDefaultBackfillDialog,
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import ProjectEditForm from '@/components/forms/ProjectEditForm.vue';
import ProjectsTable from '@/components/ProjectsTable.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useAdminProjectsData } from '@/composables/projects/useAdminProjectsData';
import { useProjectArchiveActions } from '@/composables/projects/useProjectArchiveActions';
import { useProjectBillableBackfillFlow } from '@/composables/projects/useProjectBillableBackfillFlow';
import { useProjectEditActions } from '@/composables/projects/useProjectEditActions';
import { useProjectsTableState } from '@/composables/useProjectsTableState';
import { routeNames } from '@/router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const { requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const accessToken = computed(() => authStore.accessToken);

function notifyProjectsError(
  message: string,
  error: unknown,
  action: string,
): void {
  errorToast(message, {
    error,
    logContext: { action, feature: 'projects' },
  });
}

const {
  initialLoaded,
  loadError,
  loading,
  loadProjectsData,
  members,
  projects,
  refreshProjects,
  summary,
} = useAdminProjectsData({
  accessToken,
  onError: notifyProjectsError,
});

const {
  collapseRow: collapseProjectRow,
  emptyDescription: projectTableEmptyDescription,
  expandedRows: projectTableExpandedRows,
  filters: projectTableFilters,
  hoursFilterOptions,
  memberFilterOptions,
  rows: projectTableRows,
  setExpandedRows: setProjectTableExpandedRows,
  sourceFilterOptions,
  toggleExpansion: toggleProjectExpansion,
  updateFilters: updateProjectTableFilters,
  visibilityFilterOptions,
} = useProjectsTableState({
  members,
  projects,
});

const {
  closeProjectBackfillDialog,
  handleProjectBackfillSubmitted,
  openProjectBackfillDialogIfNeeded,
  projectBackfillDialog,
  submittingProjectBackfill,
} = useProjectBillableBackfillFlow({
  onError: notifyProjectsError,
  onSuccess: successToast,
  refreshProjects,
});

const { handleProjectEditSubmitted, savingProjectEditId } =
  useProjectEditActions({
    accessToken,
    collapseProjectRow,
    onError: notifyProjectsError,
    onSuccess: successToast,
    openProjectBackfillDialogIfNeeded,
    refreshProjects,
  });

const { handleArchive, handleUnarchive } = useProjectArchiveActions({
  accessToken,
  collapseProjectRow,
  onError: notifyProjectsError,
  onSuccess: successToast,
  refreshProjects,
  requireConfirmation,
});

async function fetchAll(): Promise<void> {
  await loadProjectsData({
    errorAction: 'load-projects',
    setError: true,
    setInitialLoaded: true,
  });
}

function handleNewProject(): void {
  router.push({ name: routeNames.addProject });
}

function handleEditProject(project: ProjectResponse): void {
  toggleProjectExpansion(project);
}

onMounted(fetchAll);
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="loading && !initialLoaded">
      <ManagementPageSkeleton variant="projects" />
    </template>

    <template v-else-if="loadError && !loading">
      <RequestErrorCard
        title="Failed to load projects"
        :message="loadError"
        @retry="fetchAll"
      />
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Active Projects"
          :value="summary.activeProjects"
        />
        <StatCard
          label="Private"
          :value="summary.privateProjects"
        />
        <StatCard
          label="Public"
          :value="summary.publicProjects"
        />
      </div>

      <SurfaceCard padding-class="p-6">
        <ProjectsTable
          :empty-description="projectTableEmptyDescription"
          :expanded-rows="projectTableExpandedRows"
          :filters="projectTableFilters"
          :hours-filter-options="hoursFilterOptions"
          :is-mobile-viewport="isMobileViewport"
          :loading="loading"
          :member-filter-options="memberFilterOptions"
          :rows="projectTableRows"
          :source-filter-options="sourceFilterOptions"
          :visibility-filter-options="visibilityFilterOptions"
          @edit-project="handleEditProject"
          @new-project="handleNewProject"
          @update:expanded-rows="setProjectTableExpandedRows"
          @update:filters="updateProjectTableFilters"
        >
          <template #row-expansion="{ row }">
            <ProjectEditForm
              v-if="projectTableExpandedRows[row.id]"
              :project="row.project"
              :all-members="members"
              :saving="savingProjectEditId === row.id"
              @archive="handleArchive(row.project)"
              @save="handleProjectEditSubmitted(row.project, $event)"
              @unarchive="handleUnarchive(row.project)"
              @cancelled="collapseProjectRow(row.project)"
            />
          </template>
        </ProjectsTable>
      </SurfaceCard>

      <BillableDefaultBackfillDialog
        v-if="projectBackfillDialog"
        v-model:update-tasks="projectBackfillDialog.updateTasks"
        v-model:update-time-entries="projectBackfillDialog.updateTimeEntries"
        :entity-name="projectBackfillDialog.projectName"
        :has-tasks="projectBackfillDialog.hasTasks"
        :has-time-entries="projectBackfillDialog.hasTimeEntries"
        :is-open="true"
        :is-submitting="submittingProjectBackfill"
        variant="project"
        @close="closeProjectBackfillDialog"
        @submit="handleProjectBackfillSubmitted"
      />
    </template>
  </div>
</template>
