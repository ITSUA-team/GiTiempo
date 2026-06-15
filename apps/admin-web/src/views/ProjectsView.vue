<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  BillableDefaultBackfillDialog,
  SectionHeader,
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';
import type { ProjectEditFormInput } from '@gitiempo/web-shared';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import ProjectEditForm from '@/components/forms/ProjectEditForm.vue';
import ProjectsTable from '@/components/ProjectsTable.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useProjectsTableState } from '@/composables/useProjectsTableState';
import { routeNames } from '@/router';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const { requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const projects = ref<ProjectListResponse>([]);
const summary = ref<ManagementProjectSummaryResponse>({
  activeProjects: 0,
  privateProjects: 0,
  publicProjects: 0,
});
const members = ref<WorkspaceMemberListResponse>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const initialLoaded = ref(false);
const savingProjectEditId = ref<string | null>(null);
const submittingProjectBackfill = ref(false);

const projectBackfillDialog = ref<{
  hasTasks: boolean;
  hasTimeEntries: boolean;
  projectId: string;
  projectName: string;
  updateTasks: boolean;
  updateTimeEntries: boolean;
} | null>(null);

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

function sortProjects(list: ProjectListResponse): ProjectListResponse {
  return [...list].sort((a, b) => {
    if (a.isActive === b.isActive) {
      return 0;
    }

    return a.isActive ? -1 : 1;
  });
}

async function fetchAll(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  loading.value = true;
  loadError.value = null;

  try {
    const [projectsData, summaryData, membersData] = await Promise.all([
      adminProjectsClient.listProjects(),
      adminProjectsClient.getManagementSummary(),
      adminMembersClient.listMembers(),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
    members.value = membersData;
    initialLoaded.value = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    loadError.value = message;
    errorToast(message, {
      error: err,
      logContext: { action: 'load-projects', feature: 'projects' },
    });
  } finally {
    loading.value = false;
  }
}

async function refresh(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  loading.value = true;

  try {
    const [projectsData, summaryData, membersData] = await Promise.all([
      adminProjectsClient.listProjects(),
      adminProjectsClient.getManagementSummary(),
      adminMembersClient.listMembers(),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
    members.value = membersData;
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'An unexpected error occurred', {
      error: err,
      logContext: { action: 'refresh-projects', feature: 'projects' },
    });
  } finally {
    loading.value = false;
  }
}

async function openProjectBackfillDialogIfNeeded(
  project: ProjectResponse,
): Promise<void> {
  try {
    const [tasksData, timeEntriesData] = await Promise.all([
      adminProjectsClient.listProjectTasks(project.id),
      adminProjectsClient.listProjectTimeEntries(project.id, { limit: 1 }),
    ]);
    const hasTasks = tasksData.length > 0;
    const hasTimeEntries = timeEntriesData.meta.total > 0;

    if (!hasTasks && !hasTimeEntries) {
      return;
    }

    projectBackfillDialog.value = {
      hasTasks,
      hasTimeEntries,
      projectId: project.id,
      projectName: project.name,
      updateTasks: hasTasks,
      updateTimeEntries: hasTimeEntries,
    };
  } catch (err) {
    errorToast(
      err instanceof Error
        ? err.message
        : 'Failed to check existing project records',
      {
        error: err,
        logContext: { action: 'check-project-backfill', feature: 'projects' },
      },
    );
  }
}

function closeProjectBackfillDialog(): void {
  if (submittingProjectBackfill.value) {
    return;
  }

  projectBackfillDialog.value = null;
}

async function handleProjectBackfillSubmitted(): Promise<void> {
  const dialog = projectBackfillDialog.value;

  if (!dialog) {
    return;
  }

  submittingProjectBackfill.value = true;

  try {
    const result = await adminProjectsClient.backfillProjectBillableDefault(
      dialog.projectId,
      {
        updateTasks: dialog.updateTasks,
        updateTimeEntries: dialog.updateTimeEntries,
      },
    );
    const updatedCount = result.tasksUpdated + result.timeEntriesUpdated;

    successToast(
      `${updatedCount} existing ${updatedCount === 1 ? 'record has' : 'records have'} been updated.`,
    );
    projectBackfillDialog.value = null;
    await refresh();
  } catch (err) {
    errorToast(
      err instanceof Error ? err.message : 'Failed to update existing records',
      {
        error: err,
        logContext: { action: 'backfill-project-default', feature: 'projects' },
      },
    );
  } finally {
    submittingProjectBackfill.value = false;
  }
}

function handleNewProject(): void {
  router.push({ name: routeNames.addProject });
}

function handleEditProject(project: ProjectResponse): void {
  toggleProjectExpansion(project);
}

async function handleProjectEditSubmitted(
  project: ProjectResponse,
  input: ProjectEditFormInput,
): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  const currentMemberIds = new Set(project.members.map((member) => member.userId));
  const nextMemberIds = new Set(input.memberIds);
  const memberIdsToAdd = input.memberIds.filter((id) => !currentMemberIds.has(id));
  const memberIdsToRemove = project.members
    .map((member) => member.userId)
    .filter((id) => !nextMemberIds.has(id));
  const defaultBillableChanged =
    input.defaultBillableForTasks !== project.defaultBillableForTasks;

  savingProjectEditId.value = project.id;

  try {
    await adminProjectsClient.updateProject(project.id, {
      defaultBillableForTasks: input.defaultBillableForTasks,
      visibility: input.visibility,
    });

    for (const userId of memberIdsToAdd) {
      await adminProjectsClient.assignMember(project.id, userId);
    }
    for (const userId of memberIdsToRemove) {
      await adminProjectsClient.removeAssignment(project.id, userId);
    }

    successToast(`${project.name} has been updated.`);
    collapseProjectRow(project);
    await refresh();

    if (defaultBillableChanged) {
      await openProjectBackfillDialogIfNeeded(project);
    }
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to save project', {
      error: err,
      logContext: { action: 'update-project', feature: 'projects' },
    });
  } finally {
    savingProjectEditId.value = null;
  }
}

async function archiveProject(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  try {
    await adminProjectsClient.updateProject(project.id, {
      isActive: false,
    });
    successToast(`${project.name} has been archived.`);
    collapseProjectRow(project);
    await refresh();
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to archive project', {
      error: err,
      logContext: { action: 'archive-project', feature: 'projects' },
    });
  }
}

function handleArchive(project: ProjectResponse): void {
  requireConfirmation(
    `"${project.name}" will be archived and hidden from non-admin users.`,
    'Archive project?',
    'Archive',
    () => archiveProject(project),
  );
}

async function handleUnarchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  try {
    await adminProjectsClient.updateProject(project.id, {
      isActive: true,
    });
    successToast(`${project.name} is now active.`);
    collapseProjectRow(project);
    await refresh();
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to unarchive project', {
      error: err,
      logContext: { action: 'unarchive-project', feature: 'projects' },
    });
  }
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
      <SectionHeader
        title="Projects"
        description="Manage project visibility, member assignments, and manual project creation."
        variant="page"
      />

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

      <SurfaceCard padding-class="p-5">
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
