import {
  ForbiddenException,
  GoneException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
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

function makeConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'USER_SPA_URL') return 'http://localhost:5173';
      return undefined;
    }),
  };
}

function selectRows(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from };
}

function makeService(options: {
  identityEmail: string;
  googleSubject?: string;
  verificationError?: Error;
}) {
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
  };
  const usersService = makeUsersService();
  const config = makeConfig();
  const delivery = { deliver: vi.fn() };
  const auth = {
    prepareInvitationIdentity: vi.fn(async (email: string) =>
      firebase.getOrCreateInvitedUserByEmail(email),
    ),
    acceptInviteIdentity: vi.fn(async (_decoded, persist) =>
      persist(tx, acceptedUser),
    ),
    verifyFirebaseIdentity: options.verificationError
      ? vi.fn().mockRejectedValue(options.verificationError)
      : vi.fn().mockResolvedValue({
          decoded: {
            uid: acceptedUser.firebaseUid,
            email: options.identityEmail,
            name: acceptedUser.displayName,
          },
          googleSubject: options.googleSubject,
        }),
  };
  return {
    service: new InvitesService(
      db as never,
      firebase as never,
      config as never,
      delivery as never,
      auth as never,
    ),
    db,
    firebase,
    usersService,
    insertMembershipValues,
    updateInviteWhere,
    auth,
  };
}

describe('InvitesService', () => {
  it('rejects invite acceptance when Firebase email does not match', async () => {
    const { service, db } = makeService({
      identityEmail: 'other@example.com',
    });

    await expect(
      service.acceptInvite({
        token: 'invite-token',
        firebaseIdToken: 'firebase-token',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('creates membership and accepts the invite for a matching identity', async () => {
    const { service, auth, insertMembershipValues, updateInviteWhere } =
      makeService({ identityEmail: 'New.User@Example.com' });

    await service.acceptInvite({
      token: 'invite-token',
      firebaseIdToken: 'firebase-token',
    });

    expect(insertMembershipValues).toHaveBeenCalledWith({
      workspaceId: pendingInvite.workspaceId,
      userId: acceptedUser.id,
      role: pendingInvite.role,
    });
    expect(auth.acceptInviteIdentity).toHaveBeenCalledOnce();
    expect(updateInviteWhere).toHaveBeenCalled();
  });

  it('accepts a missing-email Google Firebase identity when the verified Google proof supplies the invited email', async () => {
    const { service, auth, insertMembershipValues } = makeService({
      identityEmail: 'new.user@example.com',
      googleSubject: 'google-subject-1',
    });

    await service.acceptInvite({
      token: 'invite-token',
      firebaseIdToken: 'firebase-token-without-email',
      googleIdToken: 'verified-google-proof',
    });

    expect(auth.verifyFirebaseIdentity).toHaveBeenCalledWith(
      'firebase-token-without-email',
      'verified-google-proof',
    );
    expect(auth.acceptInviteIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new.user@example.com' }),
      expect.any(Function),
      'google-subject-1',
    );
    expect(insertMembershipValues).toHaveBeenCalledOnce();
  });

  it('rejects a mismatched Google proof before it changes invite state', async () => {
    const { service, db, insertMembershipValues, updateInviteWhere } =
      makeService({
        identityEmail: 'new.user@example.com',
        verificationError: new UnauthorizedException('Unauthorized'),
      });

    await expect(
      service.acceptInvite({
        token: 'invite-token',
        firebaseIdToken: 'firebase-token-without-email',
        googleIdToken: 'mismatched-google-proof',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(db.transaction).not.toHaveBeenCalled();
    expect(insertMembershipValues).not.toHaveBeenCalled();
    expect(updateInviteWhere).not.toHaveBeenCalled();
  });

  it('accepts a password identity without a Google proof', async () => {
    const { service, auth } = makeService({
      identityEmail: 'new.user@example.com',
    });

    await service.acceptInvite({
      token: 'invite-token',
      firebaseIdToken: 'password-firebase-token',
    });

    expect(auth.verifyFirebaseIdentity).toHaveBeenCalledWith(
      'password-firebase-token',
      undefined,
    );
    expect(auth.acceptInviteIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new.user@example.com' }),
      expect.any(Function),
      undefined,
    );
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
    const config = makeConfig();
    const auth = {
      prepareInvitationIdentity: vi.fn(async (email: string) =>
        firebase.getOrCreateInvitedUserByEmail(email),
      ),
    };

    const service = new InvitesService(
      db as never,
      firebase as never,
      config as never,
      delivery as never,
      auth as never,
    );

    return { service, db, delivery, firebase, updateSetWhere, auth };
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
      'http://localhost:5173/invites/accept?token=new-token',
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
      'http://localhost:5173/invites/accept?token=new-token',
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
        inviteUrl: 'http://localhost:5173/invites/accept?token=new-token',
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

describe('InvitesService resendInvite', () => {
  function makeResendEnv(options?: {
    deliveryError?: boolean;
    inviteOverrides?: Partial<typeof pendingInvite>;
    linkError?: boolean;
    provisioningError?: boolean;
    reuseExistingUser?: boolean;
  }) {
    const inviteRow = {
      ...pendingInvite,
      ...options?.inviteOverrides,
    };

    const inviteLimit = vi.fn().mockResolvedValue([inviteRow]);
    const inviteWhere = vi.fn().mockReturnValue({ limit: inviteLimit });
    const inviteFrom = vi.fn().mockReturnValue({ where: inviteWhere });
    const inviteSelect = { from: inviteFrom };

    const workspaceLimit = vi
      .fn()
      .mockResolvedValue([{ name: 'Test Workspace' }]);
    const workspaceWhere = vi.fn().mockReturnValue({ limit: workspaceLimit });
    const workspaceFrom = vi.fn().mockReturnValue({ where: workspaceWhere });
    const workspaceSelect = { from: workspaceFrom };

    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(inviteSelect)
        .mockReturnValueOnce(workspaceSelect),
      transaction: vi.fn(),
      update: vi.fn(),
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
            email: inviteRow.email,
            isExistingUser: options?.reuseExistingUser ?? false,
          }),
      verifyIdToken: vi.fn(),
    };
    const config = makeConfig();
    const auth = {
      prepareInvitationIdentity: vi.fn(async (email: string) =>
        firebase.getOrCreateInvitedUserByEmail(email),
      ),
    };

    return {
      db,
      delivery,
      firebase,
      service: new InvitesService(
        db as never,
        firebase as never,
        config as never,
        delivery as never,
        auth as never,
      ),
      auth,
    };
  }

  it('resends a pending invite with the existing token and no membership creation', async () => {
    const { service, delivery, firebase, db } = makeResendEnv();

    const result = await service.resendInvite('workspace-1', 'invite-1');

    expect(firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
      'new.user@example.com',
    );
    expect(firebase.generatePasswordSetupLink).toHaveBeenCalledWith(
      'new.user@example.com',
      'http://localhost:5173/invites/accept?token=invite-token',
    );
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.user@example.com',
        inviteUrl: 'http://localhost:5173/invites/accept?token=invite-token',
        passwordSetupUrl: 'https://firebase.test/reset',
        workspaceName: 'Test Workspace',
      }),
    );
    expect(db.transaction).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'invite-1',
      status: 'pending',
      email: 'new.user@example.com',
    });
  });

  it('reuses an existing Firebase user before resend delivery', async () => {
    const { service, delivery, firebase } = makeResendEnv({
      reuseExistingUser: true,
    });

    await service.resendInvite('workspace-1', 'invite-1');

    expect(firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
      'new.user@example.com',
    );
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.user@example.com',
        inviteUrl: 'http://localhost:5173/invites/accept?token=invite-token',
      }),
    );
  });

  it('returns not found when the invite is not pending', async () => {
    const { service } = makeResendEnv({
      inviteOverrides: { status: 'accepted' },
    });

    await expect(
      service.resendInvite('workspace-1', 'invite-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns gone for expired pending invites', async () => {
    const { service } = makeResendEnv({
      inviteOverrides: { expiresAt: new Date('2020-01-01T00:00:00Z') },
    });

    await expect(
      service.resendInvite('workspace-1', 'invite-1'),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('keeps the invite pending when resend delivery fails', async () => {
    const { service, firebase, delivery, db } = makeResendEnv({
      deliveryError: true,
    });

    await expect(
      service.resendInvite('workspace-1', 'invite-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(firebase.getOrCreateInvitedUserByEmail).toHaveBeenCalledWith(
      'new.user@example.com',
    );
    expect(firebase.generatePasswordSetupLink).toHaveBeenCalledWith(
      'new.user@example.com',
      'http://localhost:5173/invites/accept?token=invite-token',
    );
    expect(delivery.deliver).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
