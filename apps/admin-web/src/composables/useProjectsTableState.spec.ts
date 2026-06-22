import { nextTick, ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { describe, expect, it } from 'vitest';

import { useProjectsTableState } from '@/composables/useProjectsTableState';

function createMembers(): WorkspaceMemberListResponse {
  return [
    {
      avatarUrl: null,
      displayName: 'Alex Admin',
      email: 'alex@example.com',
      id: 'member-1',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
      role: 'admin',
      userId: 'user-1',
      workspaceId: 'workspace-1',
    },
    {
      avatarUrl: null,
      displayName: 'Pat PM',
      email: 'pat@example.com',
      id: 'member-2',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
      role: 'pm',
      userId: 'user-2',
      workspaceId: 'workspace-1',
    },
    {
      avatarUrl: null,
      displayName: 'Nina Keller',
      email: 'nina@example.com',
      id: 'member-3',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
      role: 'member',
      userId: 'user-3',
      workspaceId: 'workspace-1',
    },
  ];
}

function createProjects(): ProjectListResponse {
  return [
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      defaultBillableForTasks: true,
      description: null,
      id: 'project-active',
      isActive: true,
      members: [
        {
          avatarUrl: null,
          displayName: 'Alex Admin',
          email: 'alex@example.com',
          role: 'admin',
          userId: 'user-1',
        },
        {
          avatarUrl: null,
          displayName: 'Pat PM',
          email: 'pat@example.com',
          role: 'pm',
          userId: 'user-2',
        },
      ],
      name: 'Project Orion',
      source: 'github',
      totalSeconds: 532800,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      defaultBillableForTasks: true,
      description: null,
      id: 'project-private',
      isActive: true,
      members: [
        {
          avatarUrl: null,
          displayName: 'Nina Keller',
          email: 'nina@example.com',
          role: 'member',
          userId: 'user-3',
        },
      ],
      name: 'Billing API',
      source: 'manual',
      totalSeconds: 309600,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      defaultBillableForTasks: true,
      description: null,
      id: 'project-empty',
      isActive: true,
      members: [],
      name: 'Dev Portal',
      source: 'manual',
      totalSeconds: 0,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      defaultBillableForTasks: true,
      description: null,
      id: 'project-inactive',
      isActive: false,
      members: [],
      name: 'Legacy Project',
      source: 'manual',
      totalSeconds: 14400,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
  ];
}

function createState() {
  const members = ref(createMembers());
  const projects = ref(createProjects());

  return {
    members,
    projects,
    state: useProjectsTableState({ members, projects }),
  };
}

function rowNames(state: ReturnType<typeof useProjectsTableState>): string[] {
  return state.rows.value.map((row) => row.name);
}

describe('useProjectsTableState', () => {
  it('derives project table rows, filter options, and empty copy', () => {
    const { state } = createState();

    expect(rowNames(state)).toEqual([
      'Project Orion',
      'Billing API',
      'Dev Portal',
      'Legacy Project',
    ]);
    expect(state.rows.value[0]).toMatchObject({
      assignedMembersLabel: '2 members',
      hoursLabel: '148h',
      nameClass: 'text-brand',
      sourceLabel: 'GitHub Repo',
      visibilityLabel: 'Public',
    });
    expect(state.rows.value[3]).toMatchObject({
      nameClass: 'text-brand',
      visibilityLabel: 'Private',
    });
    expect(state.memberFilterOptions.value).toEqual([
      { label: 'Alex Admin', value: 'user-1' },
      { label: 'Nina Keller', value: 'user-3' },
      { label: 'Pat PM', value: 'user-2' },
    ]);
    expect(state.emptyDescription.value).toBe('No projects match the current filters.');
  });

  it('formats decimal total hours as readable duration labels', () => {
    const members = ref(createMembers());
    const projects = ref<ProjectListResponse>([
      {
        ...createProjects()[0]!,
        totalSeconds: 139980,
      },
    ]);
    const state = useProjectsTableState({ members, projects });

    expect(state.rows.value[0]?.hoursLabel).toBe('38h 53m');

    state.updateFilters({ global: '38h 53m' });
    expect(rowNames(state)).toEqual(['Project Orion']);

    state.updateFilters({ global: '139980' });
    expect(rowNames(state)).toEqual([]);
  });

  it('filters projects by global search, project, source, assigned member, hours, and visibility', () => {
    const { state } = createState();

    state.updateFilters({ global: 'archived' });
    expect(rowNames(state)).toEqual(['Legacy Project']);

    state.updateFilters({ global: '' });
    state.updateFilters({ projectQuery: 'billing' });
    expect(rowNames(state)).toEqual(['Billing API']);

    state.updateFilters({ projectQuery: '' });
    state.updateFilters({ source: 'manual' });
    expect(rowNames(state)).toEqual(['Billing API', 'Dev Portal', 'Legacy Project']);

    state.updateFilters({ source: null });
    state.updateFilters({ memberIds: ['user-3'] });
    expect(rowNames(state)).toEqual(['Billing API']);

    state.updateFilters({ memberIds: [] });
    state.updateFilters({ hours: 'zero' });
    expect(rowNames(state)).toEqual(['Dev Portal']);

    state.updateFilters({ hours: 'any' });
    state.updateFilters({ visibility: 'private' });
    expect(rowNames(state)).toEqual(['Billing API', 'Legacy Project']);
  });

  it('applies filter updates and normalizes cleared controls', () => {
    const { state } = createState();

    state.updateFilters({
      global: 'archived',
      hours: 'zero',
      memberIds: ['user-3'],
      projectQuery: 'billing',
      source: 'manual',
      visibility: 'private',
    });

    expect(state.filters).toEqual({
      global: 'archived',
      hours: 'zero',
      memberIds: ['user-3'],
      projectQuery: 'billing',
      source: 'manual',
      visibility: 'private',
    });

    state.updateFilters({
      global: undefined,
      hours: undefined,
      memberIds: undefined,
      projectQuery: undefined,
      source: undefined,
      visibility: undefined,
    });

    expect(state.filters).toEqual({
      global: '',
      hours: 'any',
      memberIds: [],
      projectQuery: '',
      source: null,
      visibility: null,
    });
  });

  it('owns expansion state and prunes expanded rows when filters hide them', async () => {
    const { state } = createState();
    const project = state.rows.value[0]!.project;

    state.toggleExpansion(project);
    expect(state.expandedRows.value).toEqual({ 'project-active': true });

    state.updateFilters({ projectQuery: 'billing' });
    await nextTick();

    expect(state.expandedRows.value).toEqual({});
  });

  it('collapses rows and accepts parent expanded-row updates', () => {
    const { state } = createState();
    const project = state.rows.value[0]!.project;

    state.setExpandedRows({ 'project-active': true });
    expect(state.expandedRows.value).toEqual({ 'project-active': true });

    state.collapseRow(project);
    expect(state.expandedRows.value).toEqual({});
  });
});
