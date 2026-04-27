import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { users } from '../../users/schemas/users.schema';
import { InvitesService } from './invites.service';

const pendingInvite = {
  id: 'invite-1',
  workspaceId: 'workspace-1',
  email: 'new.user@example.com',
  token: 'invite-token',
  invitedBy: 'admin-1',
  role: 'member',
  status: 'pending',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const acceptedUser = {
  id: 'user-1',
  firebaseUid: 'new-user-uid',
  email: 'new.user@example.com',
  displayName: 'New User',
  avatarUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function selectRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function makeService(options: { firebaseEmail: string }) {
  const insertMembershipValues = vi.fn().mockResolvedValue(undefined);
  const updateInviteWhere = vi.fn().mockResolvedValue(undefined);
  const tx = {
    select: vi
      .fn()
      .mockReturnValueOnce(selectRows([pendingInvite]))
      .mockReturnValueOnce(selectRows([])),
    insert: vi.fn((table) => {
      if (table === users) {
        return {
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([acceptedUser]),
            }),
          }),
        };
      }
      if (table === workspaceMembers) return { values: insertMembershipValues };
      throw new Error('Unexpected table insert');
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: updateInviteWhere }),
    }),
  };
  const db = {
    select: vi.fn().mockReturnValue(selectRows([pendingInvite])),
    transaction: vi.fn((callback) => callback(tx)),
  };
  const firebase = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: acceptedUser.firebaseUid,
      email: options.firebaseEmail,
      name: acceptedUser.displayName,
    }),
  };
  const delivery = { deliver: vi.fn() };

  return {
    service: new InvitesService(
      db as never,
      firebase as never,
      delivery as never,
    ),
    db,
    insertMembershipValues,
    updateInviteWhere,
  };
}

describe('InvitesService', () => {
  it('rejects invite acceptance when Firebase email does not match', async () => {
    const { service, db } = makeService({ firebaseEmail: 'other@example.com' });

    await expect(
      service.acceptInvite({
        token: 'invite-token',
        firebaseIdToken: 'firebase-token',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('creates membership and accepts the invite for a matching identity', async () => {
    const { service, insertMembershipValues, updateInviteWhere } = makeService({
      firebaseEmail: 'New.User@Example.com',
    });

    await service.acceptInvite({
      token: 'invite-token',
      firebaseIdToken: 'firebase-token',
    });

    expect(insertMembershipValues).toHaveBeenCalledWith({
      workspaceId: pendingInvite.workspaceId,
      userId: acceptedUser.id,
      role: pendingInvite.role,
    });
    expect(updateInviteWhere).toHaveBeenCalled();
  });
});
