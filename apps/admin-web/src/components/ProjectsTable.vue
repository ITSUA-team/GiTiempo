<script setup lang="ts">
import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline';
import { computed, ref } from 'vue';
import type {
  ProjectListResponse,
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  EmptyStateBlock,
  ManagementTableRowAction,
  ManagementTableShell,
  managementTableColumnPt,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import ProjectEditForm from '@/components/forms/ProjectEditForm.vue';
import { useConfirmation } from '@/composables/useConfirmation';
import { useToasts } from '@/composables/useToasts';
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
const { successToast, errorToast } = useToasts();
const { requireConfirmation } = useConfirmation();
const expandedRows = ref<Record<string, boolean>>({});
const selectedMemberId = ref<string | null>(null);

const columns: ManagementTableColumn[] = [
  { key: 'project', label: 'Project', width: 'fill' },
  { key: 'source', label: 'Source', width: 140 },
  { key: 'members', label: 'Assigned members', width: 220 },
  { key: 'hours', label: 'Hours', width: 120 },
  { key: 'visibility', label: 'Visibility', width: 120 },
  { key: 'actions', label: 'Actions', width: 150, align: 'end' },
];

const memberFilterOptions = computed(() =>
  props.members.map((member) => ({
    label: `${member.displayName ?? member.email} (${member.role})`,
    value: member.userId,
  })),
);

const filteredProjects = computed(() => {
  if (!selectedMemberId.value) {
    return props.projects;
  }

  return props.projects.filter((project) =>
    project.members.some((member) => member.userId === selectedMemberId.value),
  );
});

function handleEdit(project: ProjectResponse): void {
  if (expandedRows.value[project.id]) {
    const next = { ...expandedRows.value };
    delete next[project.id];
    expandedRows.value = next;
    return;
  }

  expandedRows.value = { [project.id]: true };
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

  try {
    await adminProjectsClient.updateProject(token, project.id, {
      isActive: false,
    });
    successToast(`${project.name} has been archived.`);
    emit('archive');
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to archive project', {
      error: err,
      logContext: { action: 'archive-project', feature: 'projects' },
    });
  }
}

function confirmArchive(project: ProjectResponse): void {
  requireConfirmation(
    `"${project.name}" will be archived and hidden from non-admin users.`,
    'Archive project?',
    'Archive',
    () => handleArchive(project),
  );
}

async function handleUnarchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;
  if (!token) {
    return;
  }

  try {
    await adminProjectsClient.updateProject(token, project.id, {
      isActive: true,
    });
    successToast(`${project.name} is now active.`);
    emit('unarchive');
  } catch (err) {
    errorToast(err instanceof Error ? err.message : 'Failed to unarchive project', {
      error: err,
      logContext: { action: 'unarchive-project', feature: 'projects' },
    });
  }
}

function formatSource(source: string): string {
  return source === 'github' ? 'GitHub Repo' : 'Manual';
}
</script>

<template>
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

  <ManagementTableShell
    v-model:expanded-rows="expandedRows"
    :columns="columns"
    :value="filteredProjects"
    :loading="loading"
    data-key="id"
  >
    <Column :pt="managementTableColumnPt">
      <template #body="{ data }">
        <span
          class="text-[14px] leading-none font-semibold"
          :class="data.isActive ? 'text-text-dark' : 'text-text-muted'"
        >{{ data.name }}</span>
      </template>
    </Column>

    <Column
      style="width: 140px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          formatSource(data.source)
        }}</span>
      </template>
    </Column>

    <Column
      style="width: 220px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{ data.members.length }} members</span>
      </template>
    </Column>

    <Column
      style="width: 120px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-dark text-[13px] font-semibold">{{ data.totalHours }}h</span>
      </template>
    </Column>

    <Column
      style="width: 120px"
      :pt="managementTableColumnPt"
    >
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

    <Column
      style="width: 150px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="data.isActive">
            <ManagementTableRowAction
              :data-testid="`project-edit-${data.id}`"
              :icon="PencilSquareIcon"
              label="Edit"
              @click="handleEdit(data)"
            />
            <ManagementTableRowAction
              :data-testid="`project-archive-${data.id}`"
              :icon="ArchiveBoxIcon"
              label="Archive"
              tone="destructive"
              @click="confirmArchive(data)"
            />
          </template>
          <template v-else>
            <ManagementTableRowAction
              :data-testid="`project-unarchive-${data.id}`"
              :icon="ArrowUturnLeftIcon"
              label="Unarchive"
              tone="muted"
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
      <EmptyStateBlock
        title="No projects found"
        description="No projects match the current filter, or none have been created yet."
      />
    </template>
  </ManagementTableShell>
</template>
