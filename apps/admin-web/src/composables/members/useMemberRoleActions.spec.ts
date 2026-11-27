import { reactive } from 'vue';
import type { WorkspaceMemberResponse, WorkspaceRole } from '@gitiempo/shared';
import { ApiError } from '@gitiempo/web-shared/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMemberRoleActions } from './useMemberRoleActions';

const mocks = vi.hoisted(() => ({
  useAuthStore: vi.fn(),
  updateMemberRole: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({ useAuthStore: mocks.useAuthStore }));
vi.mock('@/services/admin-members-client', () => ({
  adminMembersClient: { updateMemberRole: mocks.updateMemberRole },
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: mocks.replace }) }));

const member: WorkspaceMemberResponse = {
  avatarUrl: null,
  canViewInvoices: false,
  displayName: 'Workspace Admin',
  email: 'admin@example.com',
  id: 'membership',
  joinedAt: '2026-05-01T10:00:00.000Z',
  lastActiveAt: null,
  projectsAssignedCount: 0,
  role: 'admin',
  userId: 'admin',
  workspaceId: 'A',
};

function token(workspaceId = 'A', role: WorkspaceRole = 'admin'): string {
  return `header.${btoa(JSON.stringify({ sub: 'admin', role, workspaceId }))}.signature`;
}

function setup() {
  const auth = reactive({
    accessToken: token(),
    profile: { id: 'admin', role: 'admin' },
    isAuthenticated: true,
    reconcileOwnRoleChange: vi.fn(),
  });
  mocks.useAuthStore.mockReturnValue(auth);
  const onError = vi.fn();
  const { saveRole } = useMemberRoleActions({ getVisit: () => 1, onError });
  return { auth, onError, saveRole };
}

describe('useMemberRoleActions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    { reason: 'actor token is not Admin', accessToken: token('A', 'pm') },
    { reason: 'profile is not Admin', profile: { id: 'admin', role: 'pm' } },
    { reason: 'profile belongs to another user', profile: { id: 'other', role: 'admin' } },
    { reason: 'target is in another workspace', target: { ...member, workspaceId: 'B' } },
    { reason: 'role is unchanged', role: 'admin' as const },
  ])('skips the request when $reason', async ({ accessToken, profile, target = member, role = 'pm' as const }) => {
    const { auth, onError, saveRole } = setup();
    if (accessToken) auth.accessToken = accessToken;
    if (profile) auth.profile = profile;

    expect(await saveRole(target, role)).toBeUndefined();

    expect(mocks.updateMemberRole).not.toHaveBeenCalled();
    expect(auth.reconcileOwnRoleChange).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    new Error('Connection interrupted'),
    new ApiError('Gateway unavailable', { status: 502 }),
  ])('verifies an interrupted self-demotion without reporting a failed save ($message)', async (error) => {
    const { auth, onError, saveRole } = setup();
    mocks.updateMemberRole.mockRejectedValueOnce(error);
    auth.reconcileOwnRoleChange.mockResolvedValueOnce('restricted');

    await saveRole(member, 'pm');

    expect(auth.reconcileOwnRoleChange).toHaveBeenCalledExactlyOnceWith(
      { userId: 'admin', workspaceId: 'A' },
      'pm',
    );
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith({ name: 'admin-forbidden' });
    expect(onError).not.toHaveBeenCalled();
  });

  it('discards a self-demotion response after switching workspaces and back', async () => {
    const { auth, onError, saveRole } = setup();
    let complete!: (updated: WorkspaceMemberResponse) => void;
    mocks.updateMemberRole.mockReturnValueOnce(new Promise<WorkspaceMemberResponse>((resolve) => {
      complete = resolve;
    }));
    const saving = saveRole(member, 'pm');
    expect(mocks.updateMemberRole).toHaveBeenCalledExactlyOnceWith(member.id, { role: 'pm' });

    auth.accessToken = token('B');
    auth.accessToken = token();
    complete({ ...member, role: 'pm' });

    expect(await saving).toBeUndefined();
    expect(auth.reconcileOwnRoleChange).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
