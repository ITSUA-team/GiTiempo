<script setup lang="ts">
import {
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
} from '@heroicons/vue/24/outline';
import { computed, reactive, ref, watch } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceRole,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import {
  EmptyStateBlock,
  ManagementTableRowAction,
  ManagementTableShell,
  MobileRecordCard,
  SectionHeader,
  formatWorkspaceRole,
  managementTableColumnPt,
  managementTableFilterInputClass,
  managementTableFilterMultiSelectPt,
  managementTableFilterSelectPt,
  useIsMobileViewport,
} from '@gitiempo/web-shared';
import type { ManagementTableColumn } from '@gitiempo/web-shared';
import Avatar from 'primevue/avatar';
import Column from 'primevue/column';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';
import MemberAssignPmPanel from '@/components/forms/MemberAssignPmPanel.vue';
import MemberEditForm from '@/components/forms/MemberEditForm.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';
import { useToasts } from '@/composables/feedback/useToasts';

type MemberLastActiveFilter = 'any' | 'today' | 'thisWeek' | 'inactive';

interface MembersTableFilters {
  global: string;
  lastActive: MemberLastActiveFilter;
  memberQuery: string;
  projectIds: string[];
  role: WorkspaceRole | null;
}

interface FilterOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

const props = defineProps<{
  members: WorkspaceMemberListResponse;
  projects: ProjectListResponse;
  loading: boolean;
  currentUserId: string | null;
}>();

const emit = defineEmits<{
  'member-removed': [];
  'role-updated': [];
  'assignments-updated': [];
}>();

const authStore = useAuthStore();
const { successToast, errorToast } = useToasts();
const { requireConfirmation } = useConfirmation();
const isMobileViewport = useIsMobileViewport();

const expandedRows = ref<Record<string, boolean>>({});
const expansionMode = ref<Record<string, 'assign' | 'edit'>>({});

const filters = reactive<MembersTableFilters>({
  global: '',
  lastActive: 'any',
  memberQuery: '',
  projectIds: [],
  role: null,
});

const columns: ManagementTableColumn[] = [
  { key: 'member', label: 'Member', width: 'fill' },
  { key: 'role', label: 'Role', width: 120 },
  { key: 'projects', label: 'Projects Assigned', width: 220 },
  { key: 'lastActive', label: 'Last Active', width: 140 },
  { key: 'actions', label: 'Actions', width: 150, align: 'end' },
];

const roleFilterOptions: FilterOption<WorkspaceRole>[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'PM', value: 'pm' },
  { label: 'Member', value: 'member' },
];

const lastActiveFilterOptions: FilterOption<MemberLastActiveFilter>[] = [
  { label: 'Any activity', value: 'any' },
  { label: 'Active today', value: 'today' },
  { label: 'Active this week', value: 'thisWeek' },
  { label: 'No activity', value: 'inactive' },
];

const projectFilterOptions = computed<FilterOption[]>(() =>
  [...props.projects]
    .map((project) => ({ label: project.name, value: project.id }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);

function getInitials(member: WorkspaceMemberResponse): string {
  const source = member.displayName?.trim() || member.email;
  const parts = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase());

  return parts.join('') || '??';
}

function getProjectsAssignedCount(member: WorkspaceMemberResponse): number {
  return member.projectsAssignedCount;
}

function formatProjectsAssigned(member: WorkspaceMemberResponse): string {
  const count = getProjectsAssignedCount(member);
  return `${count} project${count === 1 ? '' : 's'}`;
}

function getMemberDisplayName(member: WorkspaceMemberResponse): string {
  return member.displayName?.trim() || member.email;
}

const lastActiveFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) {
    return '—';
  }

  const parsed = new Date(lastActiveAt);

  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return lastActiveFormatter.format(parsed);
}

function getLastActiveDate(member: WorkspaceMemberResponse): Date | null {
  if (!member.lastActiveAt) {
    return null;
  }

  const parsed = new Date(member.lastActiveAt);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getLocalWeekStart(date: Date): Date {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset);

  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

function matchesLastActiveFilter(member: WorkspaceMemberResponse): boolean {
  if (filters.lastActive === 'any') {
    return true;
  }

  const lastActiveDate = getLastActiveDate(member);

  if (filters.lastActive === 'inactive') {
    return lastActiveDate === null;
  }

  if (!lastActiveDate) {
    return false;
  }

  const now = new Date();

  if (filters.lastActive === 'today') {
    return isSameLocalDate(lastActiveDate, now);
  }

  return lastActiveDate >= getLocalWeekStart(now) && lastActiveDate <= now;
}

function getMemberProjectOptions(member: WorkspaceMemberResponse): FilterOption[] {
  return props.projects
    .filter((project) =>
      project.members.some((projectMember) => projectMember.userId === member.userId),
    )
    .map((project) => ({ label: project.name, value: project.id }));
}

function textIncludes(value: string, search: string): boolean {
  return value.toLowerCase().includes(search);
}

function matchesMemberQuery(member: WorkspaceMemberResponse): boolean {
  const query = filters.memberQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [getMemberDisplayName(member), member.email]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function matchesProjectFilter(member: WorkspaceMemberResponse): boolean {
  if (filters.projectIds.length === 0) {
    return true;
  }

  const assignedProjectIds = new Set(
    getMemberProjectOptions(member).map((project) => project.value),
  );

  return filters.projectIds.some((projectId) => assignedProjectIds.has(projectId));
}

function matchesGlobalSearch(member: WorkspaceMemberResponse): boolean {
  const search = filters.global.trim().toLowerCase();

  if (!search) {
    return true;
  }

  const projectLabels = getMemberProjectOptions(member).map((project) => project.label);
  const haystack = [
    getMemberDisplayName(member),
    member.email,
    formatWorkspaceRole(member.role),
    formatProjectsAssigned(member),
    formatLastActive(member.lastActiveAt),
    ...projectLabels,
  ].join(' ');

  return textIncludes(haystack, search);
}

const filteredMembers = computed(() =>
  props.members.filter(
    (member) =>
      matchesGlobalSearch(member) &&
      matchesMemberQuery(member) &&
      (!filters.role || member.role === filters.role) &&
      matchesProjectFilter(member) &&
      matchesLastActiveFilter(member),
  ),
);

const membersEmptyDescription = computed(() =>
  props.members.length > 0
    ? 'No members match the current filters.'
    : 'Invite members to get started.',
);

function isSelf(member: WorkspaceMemberResponse): boolean {
  return props.currentUserId !== null && member.userId === props.currentUserId;
}

watch(filteredMembers, (members) => {
  const visibleMemberIds = new Set(members.map((member) => member.id));
  const nextExpandedRows = Object.fromEntries(
    Object.entries(expandedRows.value).filter(([id]) => visibleMemberIds.has(id)),
  );

  if (Object.keys(nextExpandedRows).length !== Object.keys(expandedRows.value).length) {
    expandedRows.value = nextExpandedRows;
    expansionMode.value = Object.fromEntries(
      Object.entries(expansionMode.value).filter(([id]) => visibleMemberIds.has(id)),
    );
  }
});

function toggleExpansion(
  member: WorkspaceMemberResponse,
  mode: 'assign' | 'edit',
): void {
  if (
    expandedRows.value[member.id] &&
    expansionMode.value[member.id] === mode
  ) {
    const next = { ...expandedRows.value };
    delete next[member.id];
    expandedRows.value = next;
  } else {
    expansionMode.value = { ...expansionMode.value, [member.id]: mode };
    expandedRows.value = { [member.id]: true };
  }
}

function collapseRow(member: WorkspaceMemberResponse): void {
  const next = { ...expandedRows.value };
  delete next[member.id];
  expandedRows.value = next;
}

function handleAssignSaved(member: WorkspaceMemberResponse): void {
  collapseRow(member);
  emit('assignments-updated');
}

function handleEditSaved(member: WorkspaceMemberResponse): void {
  collapseRow(member);
  emit('role-updated');
}

function handleRemove(member: WorkspaceMemberResponse): void {
  requireConfirmation(
    `${member.displayName ?? member.email} will be removed from this workspace. This action cannot be undone.`,
    'Remove member?',
    'Remove',
    async () => {
      const token = authStore.accessToken;
      if (!token) return;

      try {
        await adminMembersClient.removeMember(member.id);
        successToast(`${member.displayName ?? member.email} has been removed.`);
        emit('member-removed');
      } catch (err) {
        errorToast(err instanceof Error ? err.message : 'Failed to remove member', {
          error: err,
          logContext: { action: 'remove-member', feature: 'members' },
        });
      }
    },
  );
}
</script>

<template>
  <div class="mb-4">
    <SectionHeader title="Members Table">
      <template #actions>
        <IconField class="w-full sm:w-[280px]">
          <InputIcon class="pi pi-search text-text-muted" />
          <InputText
            v-model="filters.global"
            aria-label="Search members"
            class="h-[38px] w-full rounded-[6px] text-[14px]"
            placeholder="Search members"
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
        for="mobile-member-name-filter"
        class="text-text-muted text-[12px] font-medium"
      >Member</label>
      <InputText
        id="mobile-member-name-filter"
        v-model="filters.memberQuery"
        class="h-[38px] w-full rounded-[6px] text-[14px]"
        placeholder="Filter name or email"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-member-role-filter"
          class="text-text-muted text-[12px] font-medium"
        >Role</label>
        <Select
          id="mobile-member-role-filter"
          v-model="filters.role"
          :options="roleFilterOptions"
          option-label="label"
          option-value="value"
          placeholder="All roles"
          show-clear
          :pt="managementTableFilterSelectPt"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="mobile-member-last-active-filter"
          class="text-text-muted text-[12px] font-medium"
        >Last active</label>
        <Select
          id="mobile-member-last-active-filter"
          v-model="filters.lastActive"
          :options="lastActiveFilterOptions"
          option-label="label"
          option-value="value"
          :pt="managementTableFilterSelectPt"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="mobile-member-projects-filter"
        class="text-text-muted text-[12px] font-medium"
      >Projects assigned</label>
      <MultiSelect
        id="mobile-member-projects-filter"
        v-model="filters.projectIds"
        :options="projectFilterOptions"
        display="chip"
        filter
        option-label="label"
        option-value="value"
        placeholder="All projects"
        show-clear
        :max-selected-labels="1"
        selected-items-label="{0} projects"
        :pt="managementTableFilterMultiSelectPt"
      />
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
        data-testid="members-mobile-loading-card"
      >
        <div class="flex items-start gap-3">
          <Skeleton
            shape="circle"
            size="2.25rem"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton
              width="9rem"
              height="1rem"
            />
            <Skeleton
              width="7rem"
              height="0.75rem"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <Skeleton
              width="3rem"
              height="0.75rem"
            />
            <Skeleton
              width="4.5rem"
              height="0.875rem"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Skeleton
              width="4rem"
              height="0.75rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <div class="col-span-2 flex flex-col gap-2">
            <Skeleton
              width="4.5rem"
              height="0.75rem"
            />
            <Skeleton
              width="6rem"
              height="0.875rem"
            />
          </div>
        </div>
      </MobileRecordCard>
    </template>

    <template v-else-if="filteredMembers.length > 0">
      <MobileRecordCard
        v-for="member in filteredMembers"
        :key="member.id"
        data-testid="member-mobile-card"
      >
        <div class="flex items-start gap-3">
          <Avatar
            :image="member.avatarUrl ?? undefined"
            :label="!member.avatarUrl ? getInitials(member) : undefined"
            shape="circle"
            class="size-9 shrink-0"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="min-w-0 flex-1">
            <h3 class="text-text-dark truncate text-[15px] font-semibold">
              {{ member.displayName ?? member.email }}
            </h3>
            <p
              v-if="member.displayName"
              class="text-text-muted truncate text-[12px]"
            >
              {{ member.email }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Role</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ formatWorkspaceRole(member.role) }}
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-text-muted text-xs">Projects</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ formatProjectsAssigned(member) }}
            </span>
          </div>
          <div class="col-span-2 flex flex-col gap-1">
            <span class="text-text-muted text-xs">Last active</span>
            <span class="text-text-dark text-[13px] font-semibold">
              {{ formatLastActive(member.lastActiveAt) }}
            </span>
          </div>
        </div>

        <template
          v-if="!isSelf(member)"
          #actions
        >
          <ManagementTableRowAction
            v-if="member.role !== 'admin'"
            :data-testid="`member-mobile-assign-pm-${member.id}`"
            :icon="UserPlusIcon"
            label="Assign PM"
            @click="toggleExpansion(member, 'assign')"
          />
          <ManagementTableRowAction
            :data-testid="`member-mobile-edit-${member.id}`"
            :icon="PencilSquareIcon"
            label="Edit"
            @click="toggleExpansion(member, 'edit')"
          />
          <ManagementTableRowAction
            :data-testid="`member-mobile-remove-${member.id}`"
            :icon="TrashIcon"
            label="Remove"
            tone="destructive"
            @click="handleRemove(member)"
          />
        </template>

        <MemberAssignPmPanel
          v-if="expansionMode[member.id] === 'assign' && expandedRows[member.id]"
          :member="member"
          :projects="projects"
          @saved="handleAssignSaved(member)"
          @cancelled="collapseRow(member)"
        />
        <MemberEditForm
          v-else-if="expansionMode[member.id] === 'edit' && expandedRows[member.id]"
          :member="member"
          @saved="handleEditSaved(member)"
          @cancelled="collapseRow(member)"
        />
      </MobileRecordCard>
    </template>

    <EmptyStateBlock
      v-else
      title="No members found"
      :description="membersEmptyDescription"
    />
  </div>

  <ManagementTableShell
    v-else
    v-model:expanded-rows="expandedRows"
    :columns="columns"
    :value="filteredMembers"
    :loading="loading"
    data-key="id"
    header-class="border-divider bg-app-bg text-text-dark flex h-[44px] min-w-[930px] items-center border-b font-sans text-[13px] font-semibold"
    shell-class="border-divider overflow-x-auto rounded-[6px] border"
    single-scroll
    table-class="min-w-[930px] w-full table-fixed border-collapse"
    table-container-class="overflow-visible rounded-none border-none"
  >
    <template #filters>
      <div class="flex min-w-[930px] flex-1 items-center">
        <div class="min-w-0 flex-1 px-3">
          <InputText
            v-model="filters.memberQuery"
            aria-label="Filter members by name or email"
            :class="managementTableFilterInputClass"
            placeholder="Filter name or email"
          />
        </div>

        <div class="w-[120px] px-3">
          <Select
            v-model="filters.role"
            :options="roleFilterOptions"
            aria-label="Filter members by role"
            option-label="label"
            option-value="value"
            placeholder="All roles"
            show-clear
            :pt="managementTableFilterSelectPt"
          />
        </div>

        <div class="w-[220px] px-3">
          <MultiSelect
            v-model="filters.projectIds"
            :options="projectFilterOptions"
            aria-label="Filter members by assigned projects"
            display="chip"
            filter
            option-label="label"
            option-value="value"
            placeholder="All projects"
            show-clear
            :max-selected-labels="1"
            selected-items-label="{0} projects"
            :pt="managementTableFilterMultiSelectPt"
          />
        </div>

        <div class="w-[140px] px-3">
          <Select
            v-model="filters.lastActive"
            :options="lastActiveFilterOptions"
            aria-label="Filter members by last active"
            option-label="label"
            option-value="value"
            :pt="managementTableFilterSelectPt"
          />
        </div>

        <div class="w-[150px] px-3" />
      </div>
    </template>

    <!-- Member: avatar + name + email -->
    <Column :pt="managementTableColumnPt">
      <template #body="{ data }">
        <div class="flex items-center gap-3">
          <Avatar
            :image="data.avatarUrl ?? undefined"
            :label="!data.avatarUrl ? getInitials(data) : undefined"
            shape="circle"
            class="size-8"
            :pt="{
              root: 'bg-accent-tint text-brand text-[13px] font-semibold',
            }"
          />
          <div class="flex flex-col">
            <span class="text-text-dark text-[14px] font-semibold">
              {{ data.displayName ?? data.email }}
            </span>
            <span
              v-if="data.displayName"
              class="text-text-muted text-[12px]"
            >{{ data.email }}</span>
          </div>
        </div>
      </template>
    </Column>

    <!-- Role -->
    <Column
      style="width: 120px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-[13px] font-bold text-black">{{
          formatWorkspaceRole(data.role)
        }}</span>
      </template>
    </Column>

    <!-- Projects Assigned -->
    <Column
      style="width: 220px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          formatProjectsAssigned(data)
        }}</span>
      </template>
    </Column>

    <!-- Last Active -->
    <Column
      style="width: 140px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <span class="text-text-muted text-[13px] font-normal">{{
          formatLastActive(data.lastActiveAt)
        }}</span>
      </template>
    </Column>

    <!-- Actions -->
    <Column
      style="width: 150px"
      :pt="managementTableColumnPt"
    >
      <template #body="{ data }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="!isSelf(data)">
            <ManagementTableRowAction
              v-if="data.role !== 'admin'"
              :data-testid="`member-assign-pm-${data.id}`"
              :icon="UserPlusIcon"
              label="Assign PM"
              @click="toggleExpansion(data, 'assign')"
            />
            <ManagementTableRowAction
              :data-testid="`member-edit-${data.id}`"
              :icon="PencilSquareIcon"
              label="Edit"
              @click="toggleExpansion(data, 'edit')"
            />
            <ManagementTableRowAction
              :data-testid="`member-remove-${data.id}`"
              :icon="TrashIcon"
              label="Remove"
              tone="destructive"
              @click="handleRemove(data)"
            />
          </template>
        </div>
      </template>
    </Column>

    <!-- Expansion: Assign PM panel or Edit form -->
    <template #expansion="{ data }">
      <MemberAssignPmPanel
        v-if="expansionMode[data.id] === 'assign'"
        :member="data"
        :projects="projects"
        @saved="handleAssignSaved(data)"
        @cancelled="collapseRow(data)"
      />
      <MemberEditForm
        v-else-if="expansionMode[data.id] === 'edit'"
        :member="data"
        @saved="handleEditSaved(data)"
        @cancelled="collapseRow(data)"
      />
    </template>

    <template #empty>
      <EmptyStateBlock
        title="No members found"
        :description="membersEmptyDescription"
      />
    </template>
  </ManagementTableShell>
</template>
