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
  SectionHeader,
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
  <div class="mb-4">
    <SectionHeader title="Projects Table">
      <template #actions>
        <div class="flex flex-col gap-1.5 sm:w-[260px]">
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
            class="w-full"
          />
        </div>
      </template>
    </SectionHeader>
  </div>

  <div class="flex flex-col gap-3 sm:hidden">
    <template v-if="filteredProjects.length > 0">
      <article
        v-for="project in filteredProjects"
        :key="project.id"
        data-testid="project-mobile-card"
        class="border-divider bg-surface flex flex-col gap-3 rounded-lg border p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3
              class="truncate text-[15px] font-semibold"
              :class="project.isActive ? 'text-text-dark' : 'text-text-muted'"
            >
              {{ project.name }}
            </h3>
            <p class="text-text-muted text-[13px]">
              {{ formatSource(project.source) }}
            </p>
          </div>

          <template v-if="project.isActive">
            <Tag
              v-if="project.visibility === 'public'"
              value="Public"
              :pt="{
                root: 'inline-flex shrink-0 items-center rounded-[6px] bg-accent-tint px-2 py-1 text-[12px] font-semibold leading-none text-brand',
              }"
            />
            <Tag
              v-else
              value="Private"
              :pt="{
                root: 'inline-flex shrink-0 items-center rounded-[6px] bg-status-warn-bg px-2 py-1 text-[12px] font-semibold leading-none text-status-warn-text',
              }"
            />
          </template>
          <Tag
            v-else
            :value="project.visibility === 'public' ? 'Public' : 'Private'"
            :pt="{
              root: 'inline-flex shrink-0 items-center rounded-[6px] bg-divider px-2 py-1 text-[12px] font-semibold leading-none',
              label: 'text-text-muted',
            }"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Assigned members</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ project.members.length }} members
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Hours</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ project.totalHours }}h
            </span>
          </div>
        </div>

        <div class="border-divider flex justify-end gap-2 border-t pt-3">
          <template v-if="project.isActive">
            <ManagementTableRowAction
              :data-testid="`project-mobile-edit-${project.id}`"
              :icon="PencilSquareIcon"
              label="Edit"
              @click="handleEdit(project)"
            />
            <ManagementTableRowAction
              :data-testid="`project-mobile-archive-${project.id}`"
              :icon="ArchiveBoxIcon"
              label="Archive"
              tone="destructive"
              @click="confirmArchive(project)"
            />
          </template>
          <ManagementTableRowAction
            v-else
            :data-testid="`project-mobile-unarchive-${project.id}`"
            :icon="ArrowUturnLeftIcon"
            label="Unarchive"
            tone="muted"
            @click="handleUnarchive(project)"
          />
        </div>

        <ProjectEditForm
          v-if="expandedRows[project.id]"
          :project="project"
          :all-members="members"
          @saved="handleEditSaved(project)"
          @cancelled="handleEditCancelled(project)"
        />
      </article>
    </template>

    <EmptyStateBlock
      v-else-if="!loading"
      title="No projects found"
      description="No projects match the current filter, or none have been created yet."
    />
  </div>

  <ManagementTableShell
    v-model:expanded-rows="expandedRows"
    :columns="columns"
    :value="filteredProjects"
    :loading="loading"
    data-key="id"
    class="hidden sm:block"
    header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[1010px] items-center border-b font-sans text-[13px] font-semibold"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    table-class="min-w-[1010px] w-full table-fixed border-collapse"
    table-container-class="overflow-visible rounded-none border-none"
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
