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
  MemberLastActiveFilter,
  MembersTableExpandedRows,
  MembersTableFilterOption,
  MembersTableFilterUpdate,
  MembersTableFilters,
  MembersTableRow,
} from '@/lib/members-table';

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

function isMemberAssignedToProject(
  project: ProjectListResponse[number],
  member: WorkspaceMemberResponse,
): boolean {
  return project.members.some((projectMember) => projectMember.userId === member.userId);
}

function formatProjectsAssigned(count: number): string {
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

  function updateFilters(update: MembersTableFilterUpdate): void {
    if ('global' in update) {
      filters.global = update.global ?? '';
    }
    if ('lastActive' in update) {
      filters.lastActive = update.lastActive ?? 'any';
    }
    if ('memberQuery' in update) {
      filters.memberQuery = update.memberQuery ?? '';
    }
    if ('projectIds' in update) {
      filters.projectIds = update.projectIds ?? [];
    }
    if ('role' in update) {
      filters.role = update.role ?? null;
    }
  }

  const projectFilterOptions = computed<MembersTableFilterOption[]>(() =>
    [...projects.value]
      .map((project) => ({ label: project.name, value: project.id }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  function getMemberProjectOptions(
    member: WorkspaceMemberResponse,
  ): MembersTableFilterOption[] {
    return projects.value
      .filter((project) => isMemberAssignedToProject(project, member))
      .map((project) => ({ label: project.name, value: project.id }));
  }

  function getActiveProjectsAssignedCount(member: WorkspaceMemberResponse): number {
    return projects.value.filter(
      (project) => project.isActive && isMemberAssignedToProject(project, member),
    ).length;
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
    const activeProjectsAssignedCount = getActiveProjectsAssignedCount(member);
    const haystack = [
      getMemberDisplayName(member),
      member.email,
      formatWorkspaceRole(member.role),
      formatProjectsAssigned(activeProjectsAssignedCount),
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
    const activeProjectsAssignedCount = getActiveProjectsAssignedCount(member);

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
      projectsAssignedLabel: formatProjectsAssigned(activeProjectsAssignedCount),
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

  function pruneExpansionState(visibleMemberIds: Set<string>): void {
    expandedRows.value = Object.fromEntries(
      Object.entries(expandedRows.value).filter(([id]) => visibleMemberIds.has(id)),
    );
  }

  function setExpandedRows(nextRows: MembersTableExpandedRows | undefined): void {
    expandedRows.value = nextRows ?? {};
  }

  function toggleExpansion(member: WorkspaceMemberResponse): void {
    if (expandedRows.value[member.id]) {
      expandedRows.value = {};
      return;
    }

    expandedRows.value = { [member.id]: true };
  }

  function collapseRow(member: WorkspaceMemberResponse): void {
    const nextExpandedRows = { ...expandedRows.value };

    delete nextExpandedRows[member.id];

    expandedRows.value = nextExpandedRows;
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
