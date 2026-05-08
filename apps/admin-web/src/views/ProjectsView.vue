<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from "@gitiempo/shared";
import { StatsHeader, SurfaceCard } from "@gitiempo/web-shared";
import Button from "primevue/button";
import Skeleton from "primevue/skeleton";
import { useToast } from "primevue/usetoast";

import ProjectStatCard from "@/components/ProjectStatCard.vue";
import ProjectsTable from "@/components/ProjectsTable.vue";
import { routeNames } from "@/router";
import { adminProjectsClient } from "@/services/admin-projects-client";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

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
    initialLoaded.value = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    loadError.value = message;
    toast.add({
      severity: "error",
      summary: "Failed to load projects",
      detail: message,
      life: 5000,
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
      adminProjectsClient.listProjects(token),
      adminProjectsClient.getManagementSummary(token),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Failed to refresh projects",
      detail: err instanceof Error ? err.message : "An unexpected error occurred",
      life: 5000,
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
  <div class="flex flex-col gap-6 p-6">
    <!-- Initial loading skeleton — mirrors real layout structure -->
    <template v-if="loading && !initialLoaded">
      <!-- StatsHeader skeleton -->
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1.5">
            <Skeleton
              width="10rem"
              height="2rem"
              border-radius="6px"
            />
            <Skeleton
              width="22rem"
              height="1rem"
              border-radius="6px"
            />
          </div>
          <Skeleton
            width="7.5rem"
            height="2.25rem"
            border-radius="6px"
          />
        </div>
        <div class="flex h-24 gap-4">
          <Skeleton
            v-for="i in 3"
            :key="i"
            class="flex-1"
            height="100%"
            border-radius="8px"
          />
        </div>
      </div>

      <!-- Table skeleton -->
      <SurfaceCard padding-class="p-5">
        <!-- Section title + filter row -->
        <div class="mb-4 flex items-center justify-between">
          <Skeleton
            width="8rem"
            height="1.25rem"
            border-radius="6px"
          />
          <Skeleton
            width="16rem"
            height="2.25rem"
            border-radius="6px"
          />
        </div>
        <!-- Table shell -->
        <div style="border: 1px solid #eeeeee; border-radius: 6px; overflow: hidden">
          <!-- Header row -->
          <div
            style="
              display: flex;
              align-items: center;
              background-color: #f4f4f5;
              height: 44px;
              border-bottom: 1px solid #eeeeee;
              padding: 0 12px;
              gap: 12px;
            "
          >
            <Skeleton
              class="flex-1"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              width="140px"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              width="220px"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              width="120px"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              width="120px"
              height="0.75rem"
              border-radius="4px"
            />
            <Skeleton
              width="150px"
              height="0.75rem"
              border-radius="4px"
            />
          </div>
          <!-- Data rows -->
          <div
            v-for="i in 6"
            :key="i"
            style="
              display: flex;
              align-items: center;
              height: 56px;
              border-top: 1px solid #eeeeee;
              padding: 0 12px;
              gap: 12px;
            "
          >
            <div class="flex flex-1 items-center">
              <Skeleton
                width="60%"
                height="0.875rem"
                border-radius="4px"
              />
            </div>
            <div style="width: 140px">
              <Skeleton
                width="70%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div style="width: 220px">
              <Skeleton
                width="50%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div style="width: 120px">
              <Skeleton
                width="40%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div style="width: 120px">
              <Skeleton
                width="3.5rem"
                height="1.4rem"
                border-radius="6px"
              />
            </div>
            <div
              style="width: 150px"
              class="flex justify-end gap-2"
            >
              <Skeleton
                width="2.5rem"
                height="0.8rem"
                border-radius="4px"
              />
              <Skeleton
                width="3.5rem"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
          </div>
        </div>
      </SurfaceCard>
    </template>

    <!-- Error state — visible only after fetch has fully failed -->
    <template v-else-if="loadError && !loading">
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

    <!-- Main content — visible only after first successful load -->
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
          <ProjectStatCard
            label="Active Projects"
            :value="summary.activeProjects"
          />
          <ProjectStatCard
            label="Private"
            :value="summary.privateProjects"
          />
          <ProjectStatCard
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
