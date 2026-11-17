import { effectScope, ref } from 'vue';
import type { ProjectListResponse, WorkspaceMemberResponse } from '@gitiempo/shared';
import { describe, expect, it, vi } from 'vitest';

import { useMemberAssignmentActions } from './useMemberAssignmentActions';
import type { MembersTableRow } from '@/lib/members-table';

function token(workspaceId = 'A', exp = 1) {
  return `header.${btoa(JSON.stringify({ sub: 'admin', role: 'admin', workspaceId, exp }))}.signature`;
}

function setup() {
  const member: WorkspaceMemberResponse = {
    avatarUrl: null, canViewInvoices: false, displayName: 'PM', email: 'pm@example.com',
    id: 'membership', joinedAt: '2026-05-01T10:00:00.000Z', lastActiveAt: null,
    projectsAssignedCount: 1, role: 'pm', userId: 'pm', workspaceId: 'A',
  };
  const row: MembersTableRow = {
    avatarImage: undefined, avatarLabel: 'PM', canAssignPm: true, canManage: true,
    email: member.email, id: member.id, lastActiveLabel: 'Never', member,
    primaryLabel: 'PM', projectsAssignedLabel: '1 project', roleLabel: 'PM', secondaryLabel: null,
  };
  const projects = ref<ProjectListResponse>([{
    accessScope: 'project', capabilities: { canManageTasks: true }, referenceProvenance: null,
    timeRoundingStepMinutes: null, trackingMode: 'managed', color: null,
    createdAt: '2026-05-01T10:00:00.000Z', defaultBillableForTasks: true, description: null,
    id: 'old-project', isActive: true,
    members: [{ avatarUrl: null, displayName: 'PM', email: member.email, role: 'pm', userId: 'pm' }],
    name: 'Old project', source: 'manual', totalSeconds: 0,
    updatedAt: '2026-05-01T10:00:00.000Z', visibility: 'public', workspaceId: 'A',
  }]);
  let resolveFirst!: () => void;
  const first = new Promise<void>((resolve) => { resolveFirst = resolve; });
  const client = {
    assignMember: vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined),
    removeAssignment: vi.fn().mockResolvedValue(undefined),
  };
  const accessToken = ref<string | null>(token());
  const visit = ref(1);
  const collapseMemberRow = vi.fn();
  const refreshMembers = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  const owner = effectScope();
  const actions = owner.run(() => useMemberAssignmentActions({
    accessToken, getVisit: () => visit.value, client, projects,
    collapseMemberRow, refreshMembers, onError,
  }))!;
  return { ...actions, accessToken, visit, row, resolveFirst, client, owner, collapseMemberRow, refreshMembers, onError };
}

describe('useMemberAssignmentActions', () => {
  it('finishes all assignments after same-workspace unmount without touching retired UI', async () => {
    const state = setup();
    const pending = state.handleAssignmentsSubmitted(state.row, { projectIds: ['new-1', 'new-2'] });
    expect(state.client.assignMember).toHaveBeenCalledExactlyOnceWith('new-1', 'pm');
    state.visit.value += 1;
    state.owner.stop();
    state.resolveFirst();
    await pending;
    expect(state.client.assignMember).toHaveBeenNthCalledWith(2, 'new-2', 'pm');
    expect(state.client.removeAssignment).toHaveBeenCalledExactlyOnceWith('old-project', 'pm');
    expect(state.collapseMemberRow).not.toHaveBeenCalled();
    expect(state.refreshMembers).not.toHaveBeenCalled();
    expect(state.onError).not.toHaveBeenCalled();
  });

  it('permanently cancels remaining writes on A to B to A even after unmount', async () => {
    const state = setup();
    const pending = state.handleAssignmentsSubmitted(state.row, { projectIds: ['new-1', 'new-2'] });
    state.visit.value += 1;
    state.owner.stop();
    state.accessToken.value = token('B');
    state.accessToken.value = token('A');
    state.resolveFirst();
    await pending;
    expect(state.client.assignMember).toHaveBeenCalledTimes(1);
    expect(state.client.removeAssignment).not.toHaveBeenCalled();
    expect(state.refreshMembers).not.toHaveBeenCalled();
  });

  it('keeps the assignment operation eligible across same-scope token renewal', async () => {
    const state = setup();
    const pending = state.handleAssignmentsSubmitted(state.row, { projectIds: ['new-1', 'new-2'] });
    state.accessToken.value = token('A', 2);
    state.resolveFirst();
    await pending;
    expect(state.client.assignMember).toHaveBeenCalledTimes(2);
    expect(state.client.removeAssignment).toHaveBeenCalledOnce();
    expect(state.collapseMemberRow).toHaveBeenCalledExactlyOnceWith(state.row.member);
    expect(state.refreshMembers).toHaveBeenCalledOnce();
    expect(state.savingMemberAssignmentId.value).toBeNull();
    state.owner.stop();
  });
});
