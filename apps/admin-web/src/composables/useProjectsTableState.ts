import { computed, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type {
  ProjectListResponse,
  ProjectResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import type {
  ProjectHoursFilter,
  ProjectsTableExpandedRows,
  ProjectsTableFilterOption,
  ProjectsTableFilterUpdate,
  ProjectsTableFilters,
  ProjectsTableRow,
} from '@/lib/projects-table';

interface UseProjectsTableStateOptions {
  members: Ref<WorkspaceMemberListResponse>;
  projects: Ref<ProjectListResponse>;
}

const sourceFilterOptions: ProjectsTableFilterOption<ProjectResponse['source']>[] = [
  { label: 'GitHub Repo', value: 'github' },
  { label: 'Manual', value: 'manual' },
];

const hoursFilterOptions: ProjectsTableFilterOption<ProjectHoursFilter>[] = [
  { label: 'Any', value: 'any' },
  { label: 'Tracked', value: 'tracked' },
  { label: '40h+', value: 'gte40' },
  { label: 'No hours', value: 'zero' },
];

const visibilityFilterOptions: ProjectsTableFilterOption<ProjectResponse['visibility']>[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
];

function createDefaultFilters(): ProjectsTableFilters {
  return {
    global: '',
    hours: 'any',
    memberIds: [],
    projectQuery: '',
    source: null,
    visibility: null,
  };
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

export function useProjectsTableState({ members, projects }: UseProjectsTableStateOptions) {
  const filters = reactive<ProjectsTableFilters>(createDefaultFilters());
  const expandedRows = ref<ProjectsTableExpandedRows>({});

  function updateFilters(update: ProjectsTableFilterUpdate): void {
    if ('global' in update) {
      filters.global = update.global ?? '';
    }
    if ('hours' in update) {
      filters.hours = update.hours ?? 'any';
    }
    if ('memberIds' in update) {
      filters.memberIds = update.memberIds ?? [];
    }
    if ('projectQuery' in update) {
      filters.projectQuery = update.projectQuery ?? '';
    }
    if ('source' in update) {
      filters.source = update.source ?? null;
    }
    if ('visibility' in update) {
      filters.visibility = update.visibility ?? null;
    }
  }

  const memberFilterOptions = computed<ProjectsTableFilterOption[]>(() =>
    members.value
      .map((member) => ({
        label: member.displayName?.trim() || member.email,
        value: member.userId,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

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

  function createRow(project: ProjectResponse): ProjectsTableRow {
    return {
      assignedMembersLabel: formatAssignedMembers(project),
      hoursLabel: `${project.totalHours}h`,
      id: project.id,
      isActive: project.isActive,
      name: project.name,
      nameClass: project.isActive ? 'text-text-dark' : 'text-text-muted',
      project,
      sourceLabel: formatSource(project.source),
      visibility: project.visibility,
      visibilityLabel: formatVisibility(project.visibility),
    };
  }

  const visibleProjects = computed(() =>
    projects.value.filter(
      (project) =>
        matchesGlobalSearch(project) &&
        matchesProjectQuery(project) &&
        (!filters.source || project.source === filters.source) &&
        matchesMemberFilter(project) &&
        matchesHoursFilter(project) &&
        (!filters.visibility || project.visibility === filters.visibility),
    ),
  );

  const rows = computed(() => visibleProjects.value.map(createRow));

  const emptyDescription = computed(() =>
    projects.value.length > 0
      ? 'No projects match the current filters.'
      : 'No projects have been created yet.',
  );

  function setExpandedRows(nextRows: ProjectsTableExpandedRows | undefined): void {
    expandedRows.value = nextRows ?? {};
  }

  function toggleExpansion(project: ProjectResponse): void {
    expandedRows.value = expandedRows.value[project.id] ? {} : { [project.id]: true };
  }

  function collapseRow(project: ProjectResponse): void {
    const nextExpandedRows = { ...expandedRows.value };
    delete nextExpandedRows[project.id];
    expandedRows.value = nextExpandedRows;
  }

  watch(visibleProjects, (nextProjects) => {
    const visibleProjectIds = new Set(nextProjects.map((project) => project.id));
    const hasHiddenExpandedRows = Object.keys(expandedRows.value).some(
      (id) => !visibleProjectIds.has(id),
    );

    if (hasHiddenExpandedRows) {
      expandedRows.value = Object.fromEntries(
        Object.entries(expandedRows.value).filter(([id]) => visibleProjectIds.has(id)),
      );
    }
  });

  return {
    collapseRow,
    emptyDescription,
    expandedRows,
    filters,
    hoursFilterOptions,
    memberFilterOptions,
    rows,
    setExpandedRows,
    sourceFilterOptions,
    toggleExpansion,
    updateFilters,
    visibilityFilterOptions,
  };
}
