<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from "@gitiempo/shared";
import { StatCard, StatsHeader, SurfaceCard } from "@gitiempo/web-shared";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";

import ProjectsTable from "@/components/ProjectsTable.vue";
import { routeNames } from "@/router";
import { adminProjectsClient } from "@/services/admin-projects-client";
import { useAuthStore } from "@/stores/auth";
import { useToasts } from "@/composables/useToasts";

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

function sortProjects(list: ProjectListResponse): ProjectListResponse {
  return [...list].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
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
      adminProjectsClient.listProjects(token),
      adminProjectsClient.getManagementSummary(token),
      adminProjectsClient.listMembers(token),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
    members.value = membersData;
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    loadError.value = message;
    errorToast(message);
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
      adminProjectsClient.listProjects(token),
      adminProjectsClient.getManagementSummary(token),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
  } catch (err) {
    errorToast(err instanceof Error ? err.message : "An unexpected error occurred");
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
  <div class="flex flex-col gap-6 p-6">
    <ConfirmDialog />
    <!-- Error state — visible banner after initial load failure -->
    <template v-if="loadError && !loading">
      <SurfaceCard padding-class="p-6">
        <div class="flex flex-col items-center gap-3 py-6 text-center">
          <span class="text-text-dark text-[15px] font-semibold">Failed to load projects</span>
          <span class="text-text-muted text-[13px]">{{ loadError }}</span>
          <Button
            label="Try again"
            severity="secondary"
            outlined
            @click="fetchAll"
          />
        </div>
      </SurfaceCard>
    </template>

    <!-- Main content — visible immediately, table overlay handles loading -->
    <template v-else>
      <StatsHeader
        title="Projects"
        description="Manage project visibility, member assignments, and manual project creation."
      >
        <template #actions>
          <Button
            label="New Project"
            @click="handleNewProject"
          />
        </template>
        <template #stats>
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
        </template>
      </StatsHeader>

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
