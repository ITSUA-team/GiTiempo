import { nextTick, ref } from 'vue';
import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { describe, expect, it } from 'vitest';

import { useMembersTableState } from '@/composables/useMembersTableState';

function createMembers(): WorkspaceMemberListResponse {
  const now = new Date();
  const older = new Date(now);
  older.setDate(older.getDate() - 10);

  return [
    {
      avatarUrl: null,
      displayName: 'Pat PM',
      email: 'pat@example.com',
      id: 'member-1',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: now.toISOString(),
      projectsAssignedCount: 1,
      role: 'pm',
      userId: 'user-2',
      workspaceId: 'workspace-1',
    },
    {
      avatarUrl: null,
      displayName: 'Alex Admin',
      email: 'alex@example.com',
      id: 'member-2',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: null,
      projectsAssignedCount: 1,
      role: 'admin',
      userId: 'user-1',
      workspaceId: 'workspace-1',
    },
    {
      avatarUrl: null,
      displayName: 'Nina Keller',
      email: 'nina@example.com',
      id: 'member-3',
      joinedAt: '2026-05-01T10:00:00.000Z',
      lastActiveAt: older.toISOString(),
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
      id: 'project-1',
      isActive: true,
      members: [
        {
          avatarUrl: null,
          displayName: 'Pat PM',
          email: 'pat@example.com',
          role: 'pm',
          userId: 'user-2',
        },
        {
          avatarUrl: null,
          displayName: 'Alex Admin',
          email: 'alex@example.com',
          role: 'admin',
          userId: 'user-1',
        },
      ],
      name: 'Project Orion',
      source: 'manual',
      totalSeconds: 43200,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'public',
      workspaceId: 'workspace-1',
    },
    {
      color: null,
      createdAt: '2026-05-01T10:00:00.000Z',
      defaultBillableForTasks: true,
      description: null,
      id: 'project-2',
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
      totalSeconds: 28800,
      updatedAt: '2026-05-01T10:00:00.000Z',
      visibility: 'private',
      workspaceId: 'workspace-1',
    },
  ];
}

function createState() {
  const members = ref(createMembers());
  const projects = ref(createProjects());
  const currentUserId = ref<string | null>('user-1');

  return {
    currentUserId,
    members,
    projects,
    state: useMembersTableState({ currentUserId, members, projects }),
  };
}

function rowNames(state: ReturnType<typeof useMembersTableState>): string[] {
  return state.rows.value.map((row) => row.primaryLabel);
}

describe('useMembersTableState', () => {
  it('derives member table rows, action flags, filter options, and empty copy', () => {
    const { state } = createState();

    expect(rowNames(state)).toEqual(['Pat PM', 'Alex Admin', 'Nina Keller']);
    expect(state.rows.value[0]).toMatchObject({
      avatarLabel: 'PP',
      canAssignPm: true,
      canManage: true,
      lastActiveLabel: expect.any(String),
      projectsAssignedLabel: '1 project',
      roleLabel: 'PM',
      secondaryLabel: 'pat@example.com',
    });
    expect(state.rows.value[1]).toMatchObject({
      canAssignPm: false,
      canManage: false,
      roleLabel: 'Admin',
    });
    expect(state.projectFilterOptions.value).toEqual([
      { label: 'Billing API', value: 'project-2' },
      { label: 'Project Orion', value: 'project-1' },
    ]);
    expect(state.emptyDescription.value).toBe('No members match the current filters.');
  });

  it('filters members by global search, member query, project, role, and activity', () => {
    const { state } = createState();

    state.updateFilters({ global: 'orion' });
    expect(rowNames(state)).toEqual(['Pat PM', 'Alex Admin']);

    state.updateFilters({ global: '' });
    state.updateFilters({ memberQuery: 'nina' });
    expect(rowNames(state)).toEqual(['Nina Keller']);

    state.updateFilters({ memberQuery: '' });
    state.updateFilters({ role: 'admin' });
    expect(rowNames(state)).toEqual(['Alex Admin']);

    state.updateFilters({ role: null });
    state.updateFilters({ projectIds: ['project-2'] });
    expect(rowNames(state)).toEqual(['Nina Keller']);

    state.updateFilters({ projectIds: [] });
    state.updateFilters({ lastActive: 'inactive' });
    expect(rowNames(state)).toEqual(['Alex Admin']);

    state.updateFilters({ lastActive: 'any' });
    expect(rowNames(state)).toEqual(['Pat PM', 'Alex Admin', 'Nina Keller']);
  });

  it('applies filter updates and normalizes cleared controls', () => {
    const { state } = createState();

    state.updateFilters({
      global: 'orion',
      lastActive: 'today',
      memberQuery: 'pat',
      projectIds: ['project-1'],
      role: 'pm',
    });

    expect(state.filters).toEqual({
      global: 'orion',
      lastActive: 'today',
      memberQuery: 'pat',
      projectIds: ['project-1'],
      role: 'pm',
    });

    state.updateFilters({
      global: undefined,
      lastActive: undefined,
      memberQuery: undefined,
      projectIds: undefined,
      role: undefined,
    });

    expect(state.filters).toEqual({
      global: '',
      lastActive: 'any',
      memberQuery: '',
      projectIds: [],
      role: null,
    });
  });

  it('owns expansion state and prunes expanded rows when filters hide them', async () => {
    const { state } = createState();
    const member = state.rows.value[0]!.member;

    state.toggleExpansion(member);
    expect(state.expandedRows.value).toEqual({ 'member-1': true });

    state.toggleExpansion(member);
    expect(state.expandedRows.value).toEqual({});

    state.toggleExpansion(member);

    state.updateFilters({ memberQuery: 'nina' });
    await nextTick();

    expect(state.expandedRows.value).toEqual({});
  });

  it('collapses rows after parent expanded-row updates', () => {
    const { state } = createState();
    const member = state.rows.value[0]!.member;

    state.toggleExpansion(member);
    state.setExpandedRows({});

    expect(state.expandedRows.value).toEqual({});

    state.toggleExpansion(member);
    state.collapseRow(member);

    expect(state.expandedRows.value).toEqual({});
  });
});
