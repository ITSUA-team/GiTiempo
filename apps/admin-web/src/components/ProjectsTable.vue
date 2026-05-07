<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  ProjectListResponse,
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import ProjectEditForm from '@/components/ProjectEditForm.vue';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  projects: ProjectListResponse;
  members: WorkspaceMemberListResponse;
  loading: boolean;
}>();

const emit = defineEmits<{
  'edit-saved': [];
  archive: [];
  unarchive: [];
}>();

const authStore = useAuthStore();
const expandedRows = ref<Record<string, boolean>>({});
const selectedMemberId = ref<string | null>(null);

const memberFilterOptions = computed(() =>
  props.members.map((m) => ({
    label: m.displayName ?? m.email,
    value: m.userId,
  })),
);

const filteredProjects = computed(() => {
  if (!selectedMemberId.value) {
    return props.projects;
  }

  return props.projects.filter((p) =>
    p.members.some((m) => m.userId === selectedMemberId.value),
  );
});

function handleEdit(project: ProjectResponse): void {
  if (expandedRows.value[project.id]) {
    const next = { ...expandedRows.value };
    delete next[project.id];
    expandedRows.value = next;
  } else {
    expandedRows.value = { [project.id]: true };
  }
}

function collapseRow(project: ProjectResponse): void {
  const next = { ...expandedRows.value };
  delete next[project.id];
  expandedRows.value = next;
}

function handleEditSaved(project: ProjectResponse): void {
  collapseRow(project);
  emit('edit-saved');
}

function handleEditCancelled(project: ProjectResponse): void {
  collapseRow(project);
}

async function handleArchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  await adminProjectsClient.updateProject(token, project.id, {
    isActive: false,
  });
  emit('archive');
}

async function handleUnarchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  await adminProjectsClient.updateProject(token, project.id, {
    isActive: true,
  });
  emit('unarchive');
}

function formatSource(source: string): string {
  return source === 'github' ? 'GitHub Repo' : 'Manual';
}
</script>

<template>
  <div class="flex items-center justify-between">
    <h2 class="text-text-dark text-lg font-semibold">Projects Table</h2>
    <div class="flex flex-col gap-1.5">
      <label
        for="member-filter"
        class="text-text-muted text-xs font-medium"
      >
        Assigned member
      </label>
      <Select
        id="member-filter"
        v-model="selectedMemberId"
        :options="memberFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="All members"
        show-clear
        class="w-65"
      />
    </div>
  </div>

  <DataTable
    v-model:expanded-rows="expandedRows"
    :value="filteredProjects"
    :loading="loading"
    data-key="id"
    :pt="{
      root: 'rounded-[6px] border border-divider overflow-hidden',
      thead: 'bg-app-bg',
      headerCell:
        'bg-app-bg h-11 px-3 text-[13px] font-semibold text-text-dark border-none',
      bodyRow: 'h-14',
      bodyCell: 'px-3 text-sm border-t border-divider',
    }"
  >
    <Column header="Project">
      <template #body="{ data }">
        <span
          class="text-sm font-semibold"
          :class="data.isActive ? 'text-text-dark' : 'text-text-muted'"
        >
          {{ data.name }}
        </span>
      </template>
    </Column>

    <Column
      header="Source"
      style="width: 140px"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px]">{{
          formatSource(data.source)
        }}</span>
      </template>
    </Column>

    <Column
      header="Assigned members"
      style="width: 220px"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px]">
          {{ data.members.length }} members
        </span>
      </template>
    </Column>

    <Column
      header="Hours"
      style="width: 120px"
    >
      <template #body="{ data }">
        <span class="text-text-dark text-[13px] font-semibold">
          {{ data.totalHours }}h
        </span>
      </template>
    </Column>

    <Column
      header="Visibility"
      style="width: 120px"
    >
      <template #body="{ data }">
        <Tag
          v-if="data.visibility === 'public'"
          value="Public"
          :pt="{
            root: 'bg-accent-tint text-brand text-xs font-semibold rounded-sm px-2 py-1',
          }"
        />
        <Tag
          v-else
          value="Private"
          :pt="{
            root: 'bg-status-warn-bg text-status-warn-text text-xs font-semibold rounded-sm px-2 py-1',
          }"
        />
      </template>
    </Column>

    <Column
      header="Actions"
      style="width: 150px"
      :pt="{
        headerCell: 'text-right',
        bodyCell: 'text-right px-3 border-t border-divider',
      }"
    >
      <template #body="{ data }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="data.isActive">
            <Button
              label="Edit"
              variant="text"
              class="text-brand px-1.5 py-1 text-[13px] font-semibold"
              @click="handleEdit(data)"
            />
            <Button
              label="Archive"
              variant="text"
              class="text-destructive px-1.5 py-1 text-[13px] font-semibold"
              @click="handleArchive(data)"
            />
          </template>
          <template v-else>
            <Button
              label="Unarchive"
              variant="text"
              class="text-text-muted px-1.5 py-1 text-[13px] font-semibold"
              @click="handleUnarchive(data)"
            />
          </template>
        </div>
      </template>
    </Column>

    <template #expansion="{ data }">
      <ProjectEditForm
        :project="data"
        :all-members="members"
        @saved="handleEditSaved(data)"
        @cancelled="handleEditCancelled(data)"
      />
    </template>
  </DataTable>
</template>

<style scoped>
:deep(.p-datatable-row-expansion td) {
  padding: 0 !important;
  border-top: 1px solid var(--color-divider);
}

/* Remove default PrimeVue border so our PT-driven border applies */
:deep(.p-datatable-table) {
  border-collapse: collapse;
}

/* Remove PrimeVue's default header bottom border — we rely on our own divider */
:deep(.p-datatable-thead > tr > th) {
  border-bottom: none;
}
</style>
