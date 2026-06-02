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
      totalHours: 148,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
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
      totalHours: 86,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-empty',
      isActive: true,
      members: [],
      name: 'Dev Portal',
      source: 'manual',
      totalHours: 0,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      description: null,
      id: 'project-inactive',
      isActive: false,
      members: [],
      name: 'Legacy Project',
      source: 'manual',
      totalHours: 4,
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
      nameClass: 'text-text-dark',
      sourceLabel: 'GitHub Repo',
      visibilityLabel: 'Public',
    });
    expect(state.rows.value[3]).toMatchObject({
      nameClass: 'text-text-muted',
      visibilityLabel: 'Private',
    });
    expect(state.memberFilterOptions.value).toEqual([
      { label: 'Alex Admin', value: 'user-1' },
      { label: 'Nina Keller', value: 'user-3' },
      { label: 'Pat PM', value: 'user-2' },
    ]);
    expect(state.emptyDescription.value).toBe('No projects match the current filters.');
  });

  it('filters projects by global search, project, source, assigned member, hours, and visibility', () => {
    const { state } = createState();

    state.filterHandlers.setGlobal('archived');
    expect(rowNames(state)).toEqual(['Legacy Project']);

    state.filterHandlers.setGlobal('');
    state.filterHandlers.setProjectQuery('billing');
    expect(rowNames(state)).toEqual(['Billing API']);

    state.filterHandlers.setProjectQuery('');
    state.filterHandlers.setSource('manual');
    expect(rowNames(state)).toEqual(['Billing API', 'Dev Portal', 'Legacy Project']);

    state.filterHandlers.setSource(null);
    state.filterHandlers.setMemberIds(['user-3']);
    expect(rowNames(state)).toEqual(['Billing API']);

    state.filterHandlers.setMemberIds([]);
    state.filterHandlers.setHours('zero');
    expect(rowNames(state)).toEqual(['Dev Portal']);

    state.filterHandlers.setHours('any');
    state.filterHandlers.setVisibility('private');
    expect(rowNames(state)).toEqual(['Billing API', 'Legacy Project']);
  });

  it('exposes filter handlers that normalize cleared controls', () => {
    const { state } = createState();

    state.filterHandlers.setGlobal('archived');
    state.filterHandlers.setProjectQuery('billing');
    state.filterHandlers.setSource('manual');
    state.filterHandlers.setMemberIds(['user-3']);
    state.filterHandlers.setHours('zero');
    state.filterHandlers.setVisibility('private');

    expect(state.filters).toEqual({
      global: 'archived',
      hours: 'zero',
      memberIds: ['user-3'],
      projectQuery: 'billing',
      source: 'manual',
      visibility: 'private',
    });

    state.filterHandlers.setGlobal(undefined);
    state.filterHandlers.setProjectQuery(undefined);
    state.filterHandlers.setSource(undefined);
    state.filterHandlers.setMemberIds(undefined);
    state.filterHandlers.setHours(undefined);
    state.filterHandlers.setVisibility(undefined);

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

    state.filterHandlers.setProjectQuery('billing');
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
