import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
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

function makeUsersService() {
  return {
    upsertFromFirebase: vi.fn().mockResolvedValue(acceptedUser),
  };
}

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
    generatePasswordSetupLink: vi.fn(),
    getOrCreateInvitedUserByEmail: vi.fn(),
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: acceptedUser.firebaseUid,
      email: options.firebaseEmail,
      name: acceptedUser.displayName,
    }),
  };
  const usersService = makeUsersService();
  const delivery = { deliver: vi.fn() };
  return {
    service: new InvitesService(
      db as never,
      firebase as never,
      usersService as never,
      delivery as never,
    ),
    db,
    firebase,
    usersService,
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
    const { service, usersService, insertMembershipValues, updateInviteWhere } =
      makeService({ firebaseEmail: 'New.User@Example.com' });

    await service.acceptInvite({
      token: 'invite-token',
      firebaseIdToken: 'firebase-token',
    });

    expect(insertMembershipValues).toHaveBeenCalledWith({
      workspaceId: pendingInvite.workspaceId,
      userId: acceptedUser.id,
      role: pendingInvite.role,
    });
    expect(usersService.upsertFromFirebase).toHaveBeenCalledWith({
      firebaseUid: acceptedUser.firebaseUid,
      email: pendingInvite.email,
      displayName: acceptedUser.displayName,
      avatarUrl: null,
    });
    expect(updateInviteWhere).toHaveBeenCalled();
  });
});

describe('InvitesService createInvite', () => {
  function makeCreateEnv(options?: {
    deliveryError?: boolean;
    linkError?: boolean;
    reuseExistingUser?: boolean;
    provisioningError?: boolean;
  }) {
    const updateSetWhere = vi.fn().mockResolvedValue(undefined);

    const emptyLimit = vi.fn().mockResolvedValue([]);
    const emptyWhere = vi.fn().mockReturnValue({ limit: emptyLimit });
    const emptyFrom = vi.fn().mockReturnValue({ where: emptyWhere });
    const emptySelect = { from: emptyFrom };

    const workspaceLimit = vi
      .fn()
      .mockResolvedValue([{ name: 'Test Workspace' }]);
    const workspaceWhere = vi.fn().mockReturnValue({ limit: workspaceLimit });
    const workspaceFrom = vi.fn().mockReturnValue({ where: workspaceWhere });
    const workspaceSelect = { from: workspaceFrom };

    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(emptySelect)
        .mockReturnValueOnce(workspaceSelect),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'invite-new',
              workspaceId: 'workspace-1',
              email: 'user@example.com',
              token: 'new-token',
              invitedBy: 'admin-1',
              role: 'member',
              status: 'pending',
              expiresAt: new Date('2099-01-01T00:00:00Z'),
              createdAt: new Date('2026-01-01T00:00:00Z'),
            },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: updateSetWhere }),
      }),
    };

    const delivery = {
      deliver: options?.deliveryError
        ? vi.fn().mockRejectedValue(new Error('SMTP failed'))
        : vi.fn().mockResolvedValue(undefined),
    };
    const firebase = {
      generatePasswordSetupLink: options?.linkError
        ? vi
            .fn()
            .mockRejectedValue(
              new Error('Failed to generate Firebase password setup link'),
            )
        : vi.fn().mockResolvedValue('https://firebase.test/reset'),
      getOrCreateInvitedUserByEmail: options?.provisioningError
        ? vi
            .fn()
            .mockRejectedValue(
              new Error('Failed to provision invited Firebase user'),
            )
        : vi.fn().mockResolvedValue({
            uid: 'firebase-invitee',
            email: 'user@example.com',
            isExistingUser: options?.reuseExistingUser ?? false,
          }),
      verifyIdToken: vi.fn(),
    };
    const usersService = makeUsersService();

    const service = new InvitesService(
      db as never,
      firebase as never,
      usersService as never,
      delivery as never,
    );

    return { service, db, delivery, firebase, updateSetWhere };
  }

  it('expires invite when delivery fails', async () => {
    const { service, delivery, firebase, updateSetWhere } = makeCreateEnv({
      deliveryError: true,
    });

    await expect(
      service.createInvite('workspace-1', 'admin-1', {
        email: 'user@example.com',
        role: 'member',
      }),
    ).rejects.toThrow('SMTP failed');

    expect(delivery.deliver).toHaveBeenCalled();
    expect(firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(firebase.generatePasswordSetupLink).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(updateSetWhere).toHaveBeenCalled();
  });

  it('allows retry after previous delivery failure expired the invite', async () => {
    const { service, delivery, firebase } = makeCreateEnv();

    const result = await service.createInvite('workspace-1', 'admin-1', {
      email: 'user@example.com',
      role: 'member',
    });

    expect(firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(firebase.generatePasswordSetupLink).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(delivery.deliver).toHaveBeenCalled();
    expect(result).toMatchObject({
      email: 'user@example.com',
      status: 'pending',
    });
  });

  it('reuses an existing Firebase user before invite delivery', async () => {
    const { service, firebase, delivery } = makeCreateEnv({
      reuseExistingUser: true,
    });

    await service.createInvite('workspace-1', 'admin-1', {
      email: 'user@example.com',
      role: 'member',
    });

    expect(firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        passwordSetupUrl: 'https://firebase.test/reset',
      }),
    );
  });

  it('expires invite when Firebase provisioning fails', async () => {
    const { service, updateSetWhere } = makeCreateEnv({
      provisioningError: true,
    });

    await expect(
      service.createInvite('workspace-1', 'admin-1', {
        email: 'user@example.com',
        role: 'member',
      }),
    ).rejects.toThrow('Failed to provision invited Firebase user');

    expect(updateSetWhere).toHaveBeenCalled();
  });

  it('expires invite when password setup link generation fails', async () => {
    const { service, updateSetWhere } = makeCreateEnv({ linkError: true });

    await expect(
      service.createInvite('workspace-1', 'admin-1', {
        email: 'user@example.com',
        role: 'member',
      }),
    ).rejects.toThrow('Failed to generate Firebase password setup link');

    expect(updateSetWhere).toHaveBeenCalled();
  });
});
