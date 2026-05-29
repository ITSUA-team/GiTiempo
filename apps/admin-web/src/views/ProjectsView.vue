<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { SectionHeader, StatCard, SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import ProjectsTable from '@/components/ProjectsTable.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useToasts } from '@/composables/feedback/useToasts';
import { routeNames } from '@/router';
import { adminMembersClient } from '@/services/admin-members-client';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const { errorToast } = useToasts();

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
    const [projectsData, summaryData] = await Promise.all([
      adminProjectsClient.listProjects(),
      adminProjectsClient.getManagementSummary(),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'An unexpected error occurred', {
      error: err,
      logContext: { action: 'refresh-projects', feature: 'projects' },
    });
  } finally {
    loading.value = false;
  }
}

function handleNewProject(): void {
  router.push({ name: routeNames.addProject });
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
      >
        <template #actions>
          <Button
            label="New Project"
            @click="handleNewProject"
          />
        </template>
      </SectionHeader>

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
          :projects="projects"
          :members="members"
          :loading="loading"
          @edit-saved="refresh"
          @archive="refresh"
          @unarchive="refresh"
        />
      </SurfaceCard>
    </template>
  </div>
</template>
