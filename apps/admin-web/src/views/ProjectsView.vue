<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from "@gitiempo/shared";
import { StatsHeader } from "@gitiempo/web-shared";
import Button from "primevue/button";

import ProjectStatCard from "@/components/ProjectStatCard.vue";
import ProjectsTable from "@/components/ProjectsTable.vue";
import { routeNames } from "@/router";
import { adminProjectsClient } from "@/services/admin-projects-client";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const projects = ref<ProjectListResponse>([]);
const summary = ref<ManagementProjectSummaryResponse>({
  activeProjects: 0,
  privateProjects: 0,
  publicProjects: 0,
});
const members = ref<WorkspaceMemberListResponse>([]);
const loading = ref(true);

const sortedProjects = computed(() =>
  [...projects.value].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1;
  }),
);

async function fetchAll(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  loading.value = true;

  try {
    const [projectsData, summaryData, membersData] = await Promise.all([
      adminProjectsClient.listProjects(token),
      adminProjectsClient.getManagementSummary(token),
      adminProjectsClient.listMembers(token),
    ]);

    projects.value = projectsData;
    summary.value = summaryData;
    members.value = membersData;
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

    projects.value = projectsData;
    summary.value = summaryData;
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
    <StatsHeader
      title="Projects"
      description="Manage project visibility, member assignments, and manual project creation."
    >
      <template #actions>
        <Button
          label="New Project"
          icon="pi pi-plus"
          @click="handleNewProject"
        />
      </template>
      <template #stats>
        <ProjectStatCard
          label="Active Projects"
          :value="summary.activeProjects"
        />
        <ProjectStatCard
          label="Private Projects"
          :value="summary.privateProjects"
        />
        <ProjectStatCard
          label="Public Projects"
          :value="summary.publicProjects"
        />
      </template>
    </StatsHeader>

    <div class="bg-surface shadow-card flex flex-col gap-4 rounded-lg p-5">
      <ProjectsTable
        :projects="sortedProjects"
        :members="members"
        :loading="loading"
        @edit-saved="refresh"
        @archive="refresh"
        @unarchive="refresh"
      />
    </div>
  </div>
</template>
