<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import ProgressSpinner from 'primevue/progressspinner';
  import Button from 'primevue/button';
  import { useAuthStore } from '@/stores/auth';
  import {
    createProjectsClient,
    createTimeEntriesClient,
    type ProjectsClient,
    type TimeEntriesClient,
  } from '@gitiempo/web-shared';
  import type { ProjectResponse, TimeEntryResponse } from '@gitiempo/shared';
  import { useProjectFormatters } from '@/composables/useProjectFormatters';
  import ProjectHeader from '@/components/project/ProjectHeader.vue';
  import TimeEntriesTable from '@/components/project/TimeEntriesTable.vue';
  import ProjectNotFound from '@/components/project/ProjectNotFound.vue';

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const timeEntriesClient: TimeEntriesClient = createTimeEntriesClient({
    apiBaseUrl,
  });

  const { formatHours } = useProjectFormatters();

  // State
  const projectId = computed(() => String(route.params.projectId ?? ''));
  const project = shallowRef<ProjectResponse | null>(null);
  const timeEntries = shallowRef<TimeEntryResponse[]>([]);
  const loading = ref(true);
  const pagination = ref({ page: 1, limit: 20, total: 0 });

  const totalHoursFormatted = computed(() =>
    project.value ? formatHours(project.value.totalHours) : '',
  );

  // Load data
  async function loadData() {
    if (!authStore.accessToken || !projectId.value) return;
    const accessToken = authStore.accessToken;
    try {
      loading.value = true;
      const [projectData, entriesData] = await Promise.all([
        projectsClient.getProject(projectId.value, accessToken),
        timeEntriesClient.listTimeEntries(
          {
            page: pagination.value.page,
            limit: pagination.value.limit,
            projectId: projectId.value,
          },
          accessToken,
        ),
      ]);
      project.value = projectData;
      timeEntries.value = entriesData.items;
      pagination.value.total = entriesData.meta.total;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail:
          error instanceof Error ? error.message : 'Failed to load project',
      });
      setTimeout(() => router.back(), 2000);
    } finally {
      loading.value = false;
    }
  }

  async function onPageChange(event: { page: number; rows: number }) {
    pagination.value.page = event.page + 1;
    pagination.value.limit = event.rows;
    await loadData();
  }

  onMounted(() => loadData());
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Back Button -->
    <Button
      icon="pi pi-arrow-left"
      variant="text"
      severity="secondary"
      label="Back"
      class="mb-0"
      @click="$router.back()"
    />

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner stroke-width="3" style="width: 40px; height: 40px" />
    </div>

    <template v-else-if="project">
      <!-- Project Header -->
      <ProjectHeader
        :project="project"
        :total-hours-formatted="totalHoursFormatted"
      />

      <!-- Time Entries Table -->
      <TimeEntriesTable
        :time-entries="timeEntries"
        :pagination="pagination"
        @page-change="onPageChange"
      />
    </template>

    <!-- Not Found -->
    <ProjectNotFound v-else />
  </div>
</template>
