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
import { useToast } from 'primevue/usetoast';

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
const toast = useToast();
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
  if (!token) return;
  try {
    await adminProjectsClient.updateProject(token, project.id, {
      isActive: false,
    });
    emit('archive');
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to archive project';
    toast.add({
      severity: 'error',
      summary: 'Archive failed',
      detail: message,
      life: 5000,
    });
  }
}

async function handleUnarchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;
  if (!token) return;
  try {
    await adminProjectsClient.updateProject(token, project.id, {
      isActive: true,
    });
    emit('unarchive');
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to unarchive project';
    toast.add({
      severity: 'error',
      summary: 'Unarchive failed',
      detail: message,
      life: 5000,
    });
  }
}

function formatSource(source: string): string {
  return source === 'github' ? 'GitHub Repo' : 'Manual';
}
</script>

<template>
  <!-- Section title + member filter -->
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-text-dark text-lg font-semibold">
      Projects Table
    </h2>
    <div class="flex flex-col gap-1.5">
      <label
        id="member-filter-label"
        class="text-text-muted text-[12px] font-medium"
      >Assigned member</label>
      <Select
        v-model="selectedMemberId"
        :options="memberFilterOptions"
        aria-labelledby="member-filter-label"
        option-label="label"
        option-value="value"
        placeholder="All members"
        show-clear
        class="w-[260px]"
      />
    </div>
  </div>

  <!--
    Table shell: rounded border ($radius-sm=6px, $color-divider=#eeeeee)
    Header is plain HTML so zero PrimeVue interference.
    DataTable body uses :show-headers="false" to avoid duplicate / unstyled headers.
  -->
  <div class="border-divider overflow-hidden rounded-[6px] border">
    <!-- Header row: exact design values — fill=$color-app-bg, height=44px, Inter 600 13px $color-text-dark -->
    <div class="bg-app-bg border-divider text-text-dark flex h-[44px] items-center border-b font-sans text-[13px] font-semibold">
      <div class="flex-1 px-3">
        Project
      </div>
      <div class="w-[140px] px-3">
        Source
      </div>
      <div class="w-[220px] px-3">
        Assigned members
      </div>
      <div class="w-[120px] px-3">
        Hours
      </div>
      <div class="w-[120px] px-3">
        Visibility
      </div>
      <div class="w-[150px] px-3 text-right">
        Actions
      </div>
    </div>

    <!-- Body: PrimeVue DataTable with headers suppressed -->
    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="filteredProjects"
      :loading="loading"
      :show-headers="false"
      data-key="id"
      class="gt-projects-table"
      :pt="{
        rowExpansion: { style: 'height: auto;' },
      }"
    >
      <Column>
        <template #body="{ data }">
          <span
            class="text-[14px] leading-none font-semibold"
            :class="data.isActive ? 'text-text-dark' : 'text-text-muted'"
          >{{ data.name }}</span>
        </template>
      </Column>

      <Column class="w-[140px]">
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{
            formatSource(data.source)
          }}</span>
        </template>
      </Column>

      <Column class="w-[220px]">
        <template #body="{ data }">
          <span class="text-text-muted text-[13px] font-normal">{{ data.members.length }} members</span>
        </template>
      </Column>

      <Column class="w-[120px]">
        <template #body="{ data }">
          <span class="text-text-dark text-[13px] font-semibold">{{ data.totalHours }}h</span>
        </template>
      </Column>

      <Column class="w-[120px]">
        <template #body="{ data }">
          <template v-if="data.isActive">
            <Tag
              v-if="data.visibility === 'public'"
              value="Public"
              :pt="{
                root: 'inline-flex items-center rounded-[6px] bg-accent-tint px-2 py-1 text-[12px] font-semibold leading-none text-brand',
              }"
            />
            <Tag
              v-else
              value="Private"
              :pt="{
                root: 'inline-flex items-center rounded-[6px] bg-status-warn-bg px-2 py-1 text-[12px] font-semibold leading-none text-status-warn-text',
              }"
            />
          </template>
          <Tag
            v-else
            :value="data.visibility === 'public' ? 'Public' : 'Private'"
            :pt="{
              root: 'inline-flex items-center rounded-[6px] bg-divider px-2 py-1 text-[12px] font-semibold leading-none',
              label: 'text-text-muted',
            }"
          />
        </template>
      </Column>

      <Column class="w-[150px]">
        <template #body="{ data }">
          <div class="flex items-center justify-end gap-2">
            <template v-if="data.isActive">
              <Button
                label="Edit"
                variant="link"
                class="gt-action-btn gt-action-btn--brand"
                @click="handleEdit(data)"
              />
              <Button
                label="Archive"
                variant="link"
                class="gt-action-btn gt-action-btn--destructive"
                @click="handleArchive(data)"
              />
            </template>
            <template v-else>
              <Button
                label="Unarchive"
                variant="link"
                class="gt-action-btn gt-action-btn--muted"
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

      <template #empty>
        <div class="flex flex-col items-center gap-2 py-10">
          <span class="text-text-dark text-[14px] font-semibold">No projects found</span>
          <span class="text-text-muted text-[13px]">
            No projects match the current filter, or none have been created yet.
          </span>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
/* Strip ALL PrimeVue DataTable default chrome — borders, backgrounds, padding */
:deep(.gt-projects-table.p-datatable) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
}

:deep(.gt-projects-table .p-datatable-table-container) {
  border: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
}

:deep(.gt-projects-table table) {
  border-collapse: collapse !important;
  width: 100% !important;
}

/* Body rows: height 56px, no background */
:deep(
  .gt-projects-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion)
) {
  height: 56px !important;
  background: transparent !important;
}

:deep(
  .gt-projects-table
    .p-datatable-tbody
    > tr:not(.p-datatable-row-expansion):hover
) {
  background: transparent !important;
}

/* Body cells (data rows only): padding [0,12], top border */
:deep(
  .gt-projects-table
    .p-datatable-tbody
    > tr:not(.p-datatable-row-expansion)
    > td
) {
  padding: 0 12px !important;
  border: none !important;
  border-top: 1px solid #eeeeee !important;
  vertical-align: middle !important;
  font-family: 'Inter', sans-serif !important;
}

/* Expansion row: auto height, no height constraint */
:deep(.gt-projects-table .p-datatable-row-expansion) {
  height: auto !important;
}

/* Expansion cell: zero padding, flush edge-to-edge */
:deep(.gt-projects-table .p-datatable-row-expansion > td) {
  padding: 0 !important;
  border: none !important;
  border-top: 1px solid #eeeeee !important;
}

/*
 * Action link-buttons — override PrimeVue Button link variant chrome.
 * Design: padding 4px 6px, Inter 600 13px, no underline, no extra margin.
 */
:deep(.gt-action-btn.p-button) {
  padding: 4px 6px !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  border-radius: 4px !important;
  text-decoration: none !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.gt-action-btn--brand.p-button) {
  color: #5d2b85 !important;
}

:deep(.gt-action-btn--destructive.p-button) {
  color: #d32f2f !important;
}

:deep(.gt-action-btn--muted.p-button) {
  color: #666666 !important;
}
</style>
