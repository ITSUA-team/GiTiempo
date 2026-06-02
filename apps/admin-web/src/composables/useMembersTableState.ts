import { computed, reactive, ref, unref, watch } from 'vue';
import type { Ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
  WorkspaceRole,
} from '@gitiempo/shared';
import { formatWorkspaceRole } from '@gitiempo/web-shared';
import {
  formatLocalCalendarDate,
  hasValidDate,
  isSameLocalDateValue,
  isWithinLocalIsoWeekToDate,
} from '@gitiempo/web-shared/time';

import type {
  MemberExpansionMode,
  MemberLastActiveFilter,
  MembersTableExpandedRows,
  MembersTableExpansionModes,
  MembersTableFilterOption,
  MembersTableFilters,
  MembersTableRow,
} from '@/components/members-table';

interface UseMembersTableStateOptions {
  currentUserId: Readonly<Ref<string | null>>;
  members: Ref<WorkspaceMemberListResponse>;
  projects: Ref<ProjectListResponse>;
}

const roleFilterOptions: MembersTableFilterOption<WorkspaceRole>[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'PM', value: 'pm' },
  { label: 'Member', value: 'member' },
];

const lastActiveFilterOptions: MembersTableFilterOption<MemberLastActiveFilter>[] = [
  { label: 'Any activity', value: 'any' },
  { label: 'Active today', value: 'today' },
  { label: 'Active this week', value: 'thisWeek' },
  { label: 'No activity', value: 'inactive' },
];

function createDefaultFilters(): MembersTableFilters {
  return {
    global: '',
    lastActive: 'any',
    memberQuery: '',
    projectIds: [],
    role: null,
  };
}

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

function textIncludes(value: string, search: string): boolean {
  return value.toLowerCase().includes(search);
}

export function useMembersTableState({
  currentUserId,
  members,
  projects,
}: UseMembersTableStateOptions) {
  const filters = reactive<MembersTableFilters>(createDefaultFilters());
  const expandedRows = ref<MembersTableExpandedRows>({});
  const expansionMode = ref<MembersTableExpansionModes>({});

  const projectFilterOptions = computed<MembersTableFilterOption[]>(() =>
    [...projects.value]
      .map((project) => ({ label: project.name, value: project.id }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  function getMemberProjectOptions(
    member: WorkspaceMemberResponse,
  ): MembersTableFilterOption[] {
    return projects.value
      .filter((project) =>
        project.members.some((projectMember) => projectMember.userId === member.userId),
      )
      .map((project) => ({ label: project.name, value: project.id }));
  }

  function matchesLastActiveFilter(member: WorkspaceMemberResponse): boolean {
    if (filters.lastActive === 'any') {
      return true;
    }

    if (filters.lastActive === 'inactive') {
      return !hasValidDate(member.lastActiveAt);
    }

    const now = new Date();

    if (filters.lastActive === 'today') {
      return isSameLocalDateValue(member.lastActiveAt, now);
    }

    return isWithinLocalIsoWeekToDate(member.lastActiveAt, now);
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
      formatLocalCalendarDate(member.lastActiveAt),
      ...projectLabels,
    ].join(' ');

    return textIncludes(haystack, search);
  }

  function isSelf(member: WorkspaceMemberResponse): boolean {
    const userId = unref(currentUserId);
    return userId !== null && member.userId === userId;
  }

  function createRow(member: WorkspaceMemberResponse): MembersTableRow {
    const self = isSelf(member);

    return {
      avatarImage: member.avatarUrl ?? undefined,
      avatarLabel: member.avatarUrl ? undefined : getInitials(member),
      canAssignPm: !self && member.role !== 'admin',
      canManage: !self,
      email: member.email,
      id: member.id,
      lastActiveLabel: formatLocalCalendarDate(member.lastActiveAt),
      member,
      primaryLabel: member.displayName ?? member.email,
      projectsAssignedLabel: formatProjectsAssigned(member),
      roleLabel: formatWorkspaceRole(member.role),
      secondaryLabel: member.displayName ? member.email : null,
    };
  }

  const visibleMembers = computed(() =>
    members.value.filter(
      (member) =>
        matchesGlobalSearch(member) &&
        matchesMemberQuery(member) &&
        (!filters.role || member.role === filters.role) &&
        matchesProjectFilter(member) &&
        matchesLastActiveFilter(member),
    ),
  );

  const rows = computed(() => visibleMembers.value.map(createRow));

  const emptyDescription = computed(() =>
    members.value.length > 0
      ? 'No members match the current filters.'
      : 'Invite members to get started.',
  );

  function updateFilters(nextFilters: MembersTableFilters): void {
    filters.global = nextFilters.global;
    filters.lastActive = nextFilters.lastActive;
    filters.memberQuery = nextFilters.memberQuery;
    filters.projectIds = [...nextFilters.projectIds];
    filters.role = nextFilters.role;
  }

  function pruneExpansionState(visibleMemberIds: Set<string>): void {
    expandedRows.value = Object.fromEntries(
      Object.entries(expandedRows.value).filter(([id]) => visibleMemberIds.has(id)),
    );
    expansionMode.value = Object.fromEntries(
      Object.entries(expansionMode.value).filter(([id]) => visibleMemberIds.has(id)),
    );
  }

  function setExpandedRows(nextRows: MembersTableExpandedRows | undefined): void {
    expandedRows.value = nextRows ?? {};
    const expandedMemberIds = new Set(
      Object.entries(expandedRows.value)
        .filter(([, expanded]) => expanded)
        .map(([id]) => id),
    );

    expansionMode.value = Object.fromEntries(
      Object.entries(expansionMode.value).filter(([id]) => expandedMemberIds.has(id)),
    );
  }

  function toggleExpansion(
    member: WorkspaceMemberResponse,
    mode: MemberExpansionMode,
  ): void {
    if (expandedRows.value[member.id] && expansionMode.value[member.id] === mode) {
      expandedRows.value = {};
      expansionMode.value = {};
      return;
    }

    expansionMode.value = { [member.id]: mode };
    expandedRows.value = { [member.id]: true };
  }

  function collapseRow(member: WorkspaceMemberResponse): void {
    const nextExpandedRows = { ...expandedRows.value };
    const nextExpansionMode = { ...expansionMode.value };

    delete nextExpandedRows[member.id];
    delete nextExpansionMode[member.id];

    expandedRows.value = nextExpandedRows;
    expansionMode.value = nextExpansionMode;
  }

  watch(visibleMembers, (nextMembers) => {
    const visibleMemberIds = new Set(nextMembers.map((member) => member.id));
    const hasHiddenExpandedRows = Object.keys(expandedRows.value).some(
      (id) => !visibleMemberIds.has(id),
    );

    if (hasHiddenExpandedRows) {
      pruneExpansionState(visibleMemberIds);
    }
  });

  return {
    collapseRow,
    emptyDescription,
    expandedRows,
    expansionMode,
    filters,
    lastActiveFilterOptions,
    projectFilterOptions,
    roleFilterOptions,
    rows,
    setExpandedRows,
    toggleExpansion,
    updateFilters,
  };
}
