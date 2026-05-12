<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type {
  ManagementProjectSummaryResponse,
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { StatCard, StatsHeader, SurfaceCard } from '@gitiempo/web-shared';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import Skeleton from 'primevue/skeleton';

import ProjectsTable from '@/components/ProjectsTable.vue';
import { useToasts } from '@/composables/useToasts';
import { routeNames } from '@/router';
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
      adminProjectsClient.listProjects(token),
      adminProjectsClient.getManagementSummary(token),
      adminProjectsClient.listMembers(token),
    ]);

    projects.value = sortProjects(projectsData);
    summary.value = summaryData;
    members.value = membersData;
    initialLoaded.value = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
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
    errorToast(err instanceof Error ? err.message : 'An unexpected error occurred');
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

    <template v-if="loading && !initialLoaded">
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

        <div class="grid gap-4 sm:grid-cols-3">
          <Skeleton
            v-for="index in 3"
            :key="index"
            height="6rem"
            border-radius="8px"
          />
        </div>
      </div>

      <SurfaceCard padding-class="p-5">
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

        <div class="border-divider overflow-hidden rounded-[6px] border">
          <div class="bg-app-bg border-divider flex h-[44px] items-center gap-3 border-b px-3">
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

          <div
            v-for="index in 6"
            :key="index"
            class="border-divider flex h-[56px] items-center gap-3 border-t px-3"
          >
            <div class="flex flex-1 items-center">
              <Skeleton
                width="60%"
                height="0.875rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[140px]">
              <Skeleton
                width="70%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[220px]">
              <Skeleton
                width="50%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[120px]">
              <Skeleton
                width="40%"
                height="0.8rem"
                border-radius="4px"
              />
            </div>
            <div class="w-[120px]">
              <Skeleton
                width="3.5rem"
                height="1.4rem"
                border-radius="6px"
              />
            </div>
            <div class="flex w-[150px] justify-end gap-2">
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
