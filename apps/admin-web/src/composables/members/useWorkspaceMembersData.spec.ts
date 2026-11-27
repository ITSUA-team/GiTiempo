import type {
  ProjectListResponse,
  WorkspaceMemberListResponse,
  WorkspaceMemberResponse,
} from '@gitiempo/shared';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useWorkspaceMembersData } from './useWorkspaceMembersData';

const timestamp = '2026-05-01T10:00:00.000Z';
const member: WorkspaceMemberResponse = {
  id: 'member-1',
  workspaceId: 'workspace-1',
  userId: 'user-1',
  email: 'pat@example.com',
  displayName: 'Pat',
  avatarUrl: null,
  role: 'member',
  joinedAt: timestamp,
  lastActiveAt: null,
  projectsAssignedCount: 0,
  canViewInvoices: false,
};
const departingMember = { ...member, id: 'member-2', userId: 'user-2', email: 'sam@example.com' };
const project: ProjectListResponse[number] = {
  id: 'project-1',
  workspaceId: member.workspaceId,
  name: 'Project Orion',
  description: null,
  color: null,
  visibility: 'private',
  defaultBillableForTasks: true,
  timeRoundingStepMinutes: null,
  source: 'manual',
  trackingMode: 'managed',
  referenceProvenance: null,
  accessScope: 'project',
  capabilities: { canManageTasks: true },
  totalSeconds: 0,
  members: [],
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe('useWorkspaceMembersData', () => {
  it('keeps confirmed role and assignment edits when an older removal refresh completes', async () => {
    let resolveMembers!: (members: WorkspaceMemberListResponse) => void;
    const removalList = new Promise<WorkspaceMemberListResponse>((resolve) => {
      resolveMembers = resolve;
    });
    const changedOnServer = { ...member, role: 'admin' } as const;
    const listMembers = vi.fn()
      .mockResolvedValueOnce([member, departingMember])
      .mockReturnValueOnce(removalList)
      .mockResolvedValueOnce([changedOnServer]);
    const listProjects = vi.fn().mockResolvedValue([project]);
    const data = useWorkspaceMembersData({
      accessToken: ref('token'),
      membersClient: { listMembers },
      projectsClient: { listProjects },
    });
    await data.loadMembersData({ errorAction: 'load-members', setInitialLoaded: true });

    const refresh = data.refreshMembers();
    const savedMember = { ...member, role: 'pm' } as const;
    data.updateMember(savedMember);
    data.applyAssignmentChanges(savedMember, {
      projectIdsToAdd: [project.id],
      projectIdsToRemove: [],
    });
    resolveMembers([member]);
    await refresh;

    expect(data.members.value).toEqual([{ ...savedMember, projectsAssignedCount: 1 }]);
    expect(data.projects.value[0]?.members).toEqual([
      { userId: member.userId, email: member.email, displayName: member.displayName, avatarUrl: null, role: 'pm' },
    ]);
    expect(listMembers).toHaveBeenCalledTimes(2);
    expect(listProjects).toHaveBeenCalledTimes(2);
    expect(data.loading.value).toBe(false);

    await data.refreshMembers();

    expect(data.members.value).toEqual([changedOnServer]);
    expect(data.projects.value).toEqual([project]);
  });
});
