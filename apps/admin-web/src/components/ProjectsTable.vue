<script setup lang="ts">
import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline';
import { computed, reactive, ref, watch } from 'vue';
import type {
  ProjectListResponse,
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import {
  EmptyStateBlock,
  ManagementTableRowAction,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  managementTableColumnPt,
  managementTableFilterInputClass,
  managementTableFilterMultiSelectPt,
  managementTableFilterSelectPt,
  useIsMobileViewport,
  type ManagementTableColumn,
} from '@gitiempo/web-shared';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Skeleton from 'primevue/skeleton';
import Select from 'primevue/select';
import Tag from 'primevue/tag';

import ProjectEditForm from '@/components/forms/ProjectEditForm.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

type ProjectHoursFilter = 'any' | 'tracked' | 'gte40' | 'zero';

interface ProjectsTableFilters {
  global: string;
  hours: ProjectHoursFilter;
  memberIds: string[];
  projectQuery: string;
  source: ProjectResponse['source'] | null;
  visibility: ProjectResponse['visibility'] | null;
}

interface FilterOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

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
const isMobileViewport = useIsMobileViewport();
const expandedRows = ref<Record<string, boolean>>({});

const filters = reactive<ProjectsTableFilters>({
  global: '',
  hours: 'any',
  memberIds: [],
  projectQuery: '',
  source: null,
  visibility: null,
});

const columns: ManagementTableColumn[] = [
  { key: 'project', label: 'Project', width: 'fill' },
  { key: 'source', label: 'Source', width: 140 },
  { key: 'members', label: 'Assigned members', width: 220 },
  { key: 'hours', label: 'Hours', width: 120 },
  { key: 'visibility', label: 'Visibility', width: 120 },
  { key: 'actions', label: 'Actions', width: 150, align: 'end' },
];

const sourceFilterOptions: FilterOption<ProjectResponse['source']>[] = [
  { label: 'GitHub Repo', value: 'github' },
  { label: 'Manual', value: 'manual' },
];

const hoursFilterOptions: FilterOption<ProjectHoursFilter>[] = [
  { label: 'Any', value: 'any' },
  { label: 'Tracked', value: 'tracked' },
  { label: '40h+', value: 'gte40' },
  { label: 'No hours', value: 'zero' },
];

const visibilityFilterOptions: FilterOption<ProjectResponse['visibility']>[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
];

const memberFilterOptions = computed<FilterOption[]>(() =>
  props.members
    .map((member) => ({
      label: member.displayName?.trim() || member.email,
      value: member.userId,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);

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

function formatVisibility(visibility: ProjectResponse['visibility']): string {
  return visibility === 'public' ? 'Public' : 'Private';
}

function formatAssignedMembers(project: ProjectResponse): string {
  const count = project.members.length;
  return `${count} member${count === 1 ? '' : 's'}`;
}

function getProjectMemberLabels(project: ProjectResponse): string[] {
  return project.members.map((member) => member.displayName?.trim() || member.email);
}

function textIncludes(value: string, search: string): boolean {
  return value.toLowerCase().includes(search);
}

function matchesProjectQuery(project: ProjectResponse): boolean {
  const query = filters.projectQuery.trim().toLowerCase();

  return !query || textIncludes(project.name, query);
}

function matchesMemberFilter(project: ProjectResponse): boolean {
  if (filters.memberIds.length === 0) {
    return true;
  }

  const projectMemberIds = new Set(project.members.map((member) => member.userId));

  return filters.memberIds.some((memberId) => projectMemberIds.has(memberId));
}

function matchesHoursFilter(project: ProjectResponse): boolean {
  if (filters.hours === 'tracked') {
    return project.totalHours > 0;
  }

  if (filters.hours === 'gte40') {
    return project.totalHours >= 40;
  }

  if (filters.hours === 'zero') {
    return project.totalHours === 0;
  }

  return true;
}

function matchesGlobalSearch(project: ProjectResponse): boolean {
  const search = filters.global.trim().toLowerCase();

  if (!search) {
    return true;
  }

  const haystack = [
    project.name,
    formatSource(project.source),
    formatAssignedMembers(project),
    `${project.totalHours}h`,
    formatVisibility(project.visibility),
    project.isActive ? 'Active' : 'Archived',
    ...getProjectMemberLabels(project),
    ...project.members.map((member) => member.email),
  ].join(' ');

  return textIncludes(haystack, search);
}

const filteredProjects = computed(() =>
  props.projects.filter(
    (project) =>
      matchesGlobalSearch(project) &&
      matchesProjectQuery(project) &&
      (!filters.source || project.source === filters.source) &&
      matchesMemberFilter(project) &&
      matchesHoursFilter(project) &&
      (!filters.visibility || project.visibility === filters.visibility),
  ),
);

const projectsEmptyDescription = computed(() =>
  props.projects.length > 0
    ? 'No projects match the current filters.'
    : 'No projects have been created yet.',
);

watch(filteredProjects, (projects) => {
  const visibleProjectIds = new Set(projects.map((project) => project.id));
  const nextExpandedRows = Object.fromEntries(
    Object.entries(expandedRows.value).filter(([id]) => visibleProjectIds.has(id)),
  );

  if (Object.keys(nextExpandedRows).length !== Object.keys(expandedRows.value).length) {
    expandedRows.value = nextExpandedRows;
  }
});
</script>

<template>
  <div class="mb-4">
    <SectionHeader title="Projects Table">
      <template #actions>
        <IconField class="w-full sm:w-[260px]">
          <InputIcon class="pi pi-search text-text-muted" />
          <InputText
            v-model="filters.global"
            aria-label="Search projects"
            class="h-[38px] w-full rounded-[6px] text-[14px]"
            placeholder="Search projects"
          />
        </IconField>
      </template>
    </SectionHeader>
  </div>

  <div
    v-if="isMobileViewport"
    class="mb-4 grid gap-3"
  >
    <div class="flex flex-col gap-1.5">
      <label
        for="mobile-project-name-filter"
        class="text-text-muted text-[12px] font-medium"
      >Project</label>
      <InputText
        id="mobile-project-name-filter"
        v-model="filters.projectQuery"
        class="h-[38px] w-full rounded-[6px] text-[14px]"
        placeholder="Filter project"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-source-filter"
          class="text-text-muted text-[12px] font-medium"
        >Source</label>
        <Select
          id="mobile-project-source-filter"
          v-model="filters.source"
          :options="sourceFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All sources"
          show-clear
          :pt="managementTableFilterSelectPt"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-visibility-filter"
          class="text-text-muted text-[12px] font-medium"
        >Visibility</label>
        <Select
          id="mobile-project-visibility-filter"
          v-model="filters.visibility"
          :options="visibilityFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All"
          show-clear
          :pt="managementTableFilterSelectPt"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-hours-filter"
          class="text-text-muted text-[12px] font-medium"
        >Hours</label>
        <Select
          id="mobile-project-hours-filter"
          v-model="filters.hours"
          :options="hoursFilterOptions"
          option-label="label"
          option-value="value"
          :pt="managementTableFilterSelectPt"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-project-members-filter"
          class="text-text-muted text-[12px] font-medium"
        >Assigned members</label>
        <MultiSelect
          id="mobile-project-members-filter"
          v-model="filters.memberIds"
          :options="memberFilterOptions"
          display="chip"
          filter
          option-label="label"
          option-value="value"
          placeholder="All members"
          show-clear
          :max-selected-labels="1"
          selected-items-label="{0} members"
          :pt="managementTableFilterMultiSelectPt"
        />
      </div>
    </div>
  </div>

  <div
    v-if="isMobileViewport"
    class="flex flex-col gap-3"
  >
    <template v-if="loading">
      <MobileRecordCard
        v-for="index in 3"
        :key="index"
        data-testid="projects-mobile-loading-card"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              width="9rem"
              height="1rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <Skeleton
            width="4.5rem"
            height="1.5rem"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <Skeleton
              width="6rem"
              height="0.75rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Skeleton
              width="3rem"
              height="0.75rem"
            />
            <Skeleton
              width="4rem"
              height="0.875rem"
            />
          </div>
        </div>
      </MobileRecordCard>
    </template>

    <template v-else-if="filteredProjects.length > 0">
      <MobileRecordCard
        v-for="project in filteredProjects"
        :key="project.id"
        data-testid="project-mobile-card"
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
              {{ formatAssignedMembers(project) }}
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Hours</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ project.totalHours }}h
            </span>
          </div>
        </div>

        <template #actions>
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
        </template>

        <ProjectEditForm
          v-if="expandedRows[project.id]"
          :project="project"
          :all-members="members"
          @saved="handleEditSaved(project)"
          @cancelled="handleEditCancelled(project)"
        />
      </MobileRecordCard>
    </template>

    <EmptyStateBlock
      v-else
      title="No projects found"
      :description="projectsEmptyDescription"
    />
  </div>

  <ManagementTableShell
    v-else
    v-model:expanded-rows="expandedRows"
    :columns="columns"
    :value="filteredProjects"
    :loading="loading"
    data-key="id"
    header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[1010px] items-center border-b font-sans text-[13px] font-semibold"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    table-class="min-w-[1010px] w-full table-fixed border-collapse"
    table-container-class="overflow-visible rounded-none border-none"
  >
    <template #filters>
      <div class="flex min-w-[1010px] flex-1 items-center">
        <div class="min-w-0 flex-1 px-3">
          <InputText
            v-model="filters.projectQuery"
            aria-label="Filter projects by name"
            :class="managementTableFilterInputClass"
            placeholder="Filter project"
          />
        </div>

        <div class="w-[140px] px-3">
          <Select
            v-model="filters.source"
            :options="sourceFilterOptions"
            aria-label="Filter projects by source"
            option-label="label"
            option-value="value"
            placeholder="All sources"
            show-clear
            :pt="managementTableFilterSelectPt"
          />
        </div>

        <div class="w-[220px] px-3">
          <MultiSelect
            v-model="filters.memberIds"
            :options="memberFilterOptions"
            aria-label="Filter projects by assigned members"
            display="chip"
            filter
            option-label="label"
            option-value="value"
            placeholder="All members"
            show-clear
            :max-selected-labels="1"
            selected-items-label="{0} members"
            :pt="managementTableFilterMultiSelectPt"
          />
        </div>

        <div class="w-[120px] px-3 text-right">
          <Select
            v-model="filters.hours"
            :options="hoursFilterOptions"
            aria-label="Filter projects by hours"
            option-label="label"
            option-value="value"
            :pt="managementTableFilterSelectPt"
          />
        </div>

        <div class="w-[120px] px-3">
          <Select
            v-model="filters.visibility"
            :options="visibilityFilterOptions"
            aria-label="Filter projects by visibility"
            option-label="label"
            option-value="value"
            placeholder="All"
            show-clear
            :pt="managementTableFilterSelectPt"
          />
        </div>

        <div class="w-[150px] px-3" />
      </div>
    </template>

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
        <span class="text-text-muted text-[13px] font-normal">{{ formatAssignedMembers(data) }}</span>
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
        :description="projectsEmptyDescription"
      />
    </template>
  </ManagementTableShell>
</template>
