<script setup lang="ts">
  import { computed, onMounted, ref, shallowRef } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useToast } from 'primevue/usetoast';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
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

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const projectsClient: ProjectsClient = createProjectsClient({ apiBaseUrl });
  const timeEntriesClient: TimeEntriesClient = createTimeEntriesClient({
    apiBaseUrl,
  });

  // State
  const projectId = computed(() => String(route.params.projectId ?? ''));
  const project = shallowRef<ProjectResponse | null>(null);
  const timeEntries = shallowRef<TimeEntryResponse[]>([]);
  const loading = ref(true);
  const pagination = ref({ page: 1, limit: 20, total: 0 });

  // Load data
  async function loadData() {
    if (!authStore.accessToken || !projectId.value) return;
    const accessToken = authStore.accessToken; // Narrow type for TypeScript
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
      // Redirect back if project not found
      setTimeout(() => router.back(), 2000);
    } finally {
      loading.value = false;
    }
  }

  // Format time
  function formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Format date
  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Format duration
  function formatDuration(seconds: number | null): string {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // Format hours
  function formatHours(hours: number): string {
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours % 1) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  // On page change
  async function onPageChange(event: any) {
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

    <!-- Project Header -->
    <div v-else-if="project" class="bg-surface shadow-card rounded-lg p-6">
      <h1 class="text-text-dark text-2xl font-semibold">
        {{ project.name }}
      </h1>
      <div class="mt-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-text-muted text-[13px] font-medium"
            >Total Tracked:</span
          >
          <span class="text-brand text-lg font-semibold">{{
            formatHours(project.totalHours)
          }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-text-muted text-[13px] font-medium">Source:</span>
          <span class="text-text-dark text-sm">{{
            project.source === 'github' ? 'GitHub' : 'Manual'
          }}</span>
        </div>
      </div>
    </div>

    <!-- Time Entries Table -->
    <div v-if="project" class="bg-surface shadow-card rounded-lg">
      <div class="border-divider border-b px-6 py-4">
        <h2 class="text-text-dark text-lg font-semibold">Time Entries</h2>
      </div>

      <div
        v-if="timeEntries.length === 0"
        class="flex flex-col items-center gap-3 px-6 py-8 text-center"
      >
        <p class="text-text-dark text-base font-semibold">
          No time entries yet
        </p>
        <p class="text-text-muted text-sm">
          Time entries for this project will appear here.
        </p>
      </div>

      <DataTable
        v-else
        :value="timeEntries"
        striped-rows
        responsive-layout="scroll"
        :paginator="pagination.total > pagination.limit"
        :rows="pagination.limit"
        :total-records="pagination.total"
        :pt="{
          headerCell:
            'bg-app-bg text-[13px] font-medium uppercase tracking-wide text-text-dark',
          bodyRow: 'border-b border-divider h-12 hover:bg-app-bg',
          bodyCell: 'text-sm',
        }"
        @page="onPageChange"
      >
        <Column header="Date">
          <template #body="{ data }">
            <div class="text-sm">
              {{ formatDate(data.startedAt) }}
            </div>
          </template>
        </Column>
        <Column header="Task">
          <template #body="{ data }">
            <div class="text-sm">
              {{ data.task.title }}
            </div>
          </template>
        </Column>
        <Column header="Time Range">
          <template #body="{ data }">
            <div class="text-sm">
              {{ formatTime(data.startedAt) }} -
              {{ data.endedAt ? formatTime(data.endedAt) : 'Ongoing' }}
            </div>
          </template>
        </Column>
        <Column
          header="Duration"
          header-class="text-right"
          body-class="text-right"
        >
          <template #body="{ data }">
            <div class="text-sm">
              {{ formatDuration(data.durationSeconds) }}
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Not Found -->
    <div
      v-else
      class="bg-surface shadow-card flex flex-col items-center gap-3 rounded-lg px-6 py-8 text-center"
    >
      <p class="text-text-dark text-base font-semibold">Project not found</p>
      <p class="text-text-muted text-sm">
        The project you're looking for doesn't exist or you don't have access to
        it.
      </p>
    </div>
  </div>
</template>
