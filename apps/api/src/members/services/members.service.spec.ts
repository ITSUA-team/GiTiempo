import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MembersService } from './members.service';

function makeMembershipSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { select: vi.fn().mockReturnValue({ from }) };
}

describe('MembersService', () => {
  it.each(['change role', 'remove'])(
    'rechecks the actor after acquiring the workspace lock before %s',
    async (action) => {
      let releaseLock!: () => void;
      const lock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      const tx = {
        select: vi.fn().mockReturnValueOnce({
          from: () => ({ where: () => ({ for: () => lock }) }),
        }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      const service = new MembersService({
        transaction: (run: (db: typeof tx) => unknown) => run(tx),
      } as never);
      const membership = vi
        .spyOn(service, 'resolveActiveMembership')
        .mockResolvedValue({
          id: 'actor-membership',
          userId: 'actor',
          workspaceId: 'workspace',
          role: 'pm',
          canViewInvoices: false,
        });
      const result =
        action === 'remove'
          ? service.removeMember('workspace', 'actor', 'target')
          : service.updateMemberRole('workspace', 'actor', 'target', {
              role: 'admin',
            });
      expect(membership).not.toHaveBeenCalled();
      releaseLock();
      await expect(result).rejects.toBeInstanceOf(ForbiddenException);
      expect(membership).toHaveBeenCalledWith('actor', 'workspace', tx);
      expect(tx.update).not.toHaveBeenCalled();
      expect(tx.delete).not.toHaveBeenCalled();
    },
  );

  it('prevents demoting the last workspace admin', async () => {
    const count = 1;
    const tx = {
      select: () => ({
        from: () => ({ where: async () => [{ value: count }] }),
      }),
    };
    const service = new MembersService(tx as never);
    const assertCanLoseAdminRole = (
      service as unknown as {
        assertCanLoseAdminRole: (
          db: typeof tx,
          workspaceId: string,
          currentRole: 'admin' | 'pm' | 'member',
          nextRole: 'admin' | 'pm' | 'member' | null,
        ) => Promise<void>;
      }
    ).assertCanLoseAdminRole.bind(service);

    await expect(
      assertCanLoseAdminRole(tx, 'workspace-1', 'admin', 'member'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows demoting when more than one admin exists', async () => {
    const count = 2;
    const tx = {
      select: () => ({
        from: () => ({ where: async () => [{ value: count }] }),
      }),
    };
    const service = new MembersService(tx as never);
    const assertCanLoseAdminRole = (
      service as unknown as {
        assertCanLoseAdminRole: (
          db: typeof tx,
          workspaceId: string,
          currentRole: 'admin' | 'pm' | 'member',
          nextRole: 'admin' | 'pm' | 'member' | null,
        ) => Promise<void>;
      }
    ).assertCanLoseAdminRole.bind(service);

    await expect(
      assertCanLoseAdminRole(tx, 'workspace-1', 'admin', 'member'),
    ).resolves.toBeUndefined();
  });

  it('rejects role checks against the current database membership', async () => {
    const db = makeMembershipSelect([
      {
        id: 'membership-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        role: 'member',
        canViewInvoices: false,
      },
    ]);
    const service = new MembersService(db as never);

    await expect(
      service.requireRole('user-1', 'workspace-1', ['admin', 'pm']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates member permissions and returns the refreshed response', async () => {
    const joinedRow = {
      id: 'membership-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      email: 'pm@example.com',
      displayName: 'Pm',
      avatarUrl: null,
      role: 'pm',
      canViewInvoices: true,
      joinedAt: new Date('2026-01-01T00:00:00Z'),
      lastActiveAt: null,
      projectsAssignedCount: 2,
    };
    const returning = vi
      .fn()
      .mockResolvedValue([
        { id: 'membership-1', userId: 'user-1', workspaceId: 'workspace-1' },
      ]);
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning }),
    });
    const update = vi.fn().mockReturnValue({ set: updateSet });
    const limit = vi.fn().mockResolvedValue([joinedRow]);
    const joinWhere = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where: joinWhere });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });
    const db = {
      transaction: async (
        handler: (tx: { select: unknown; update: unknown }) => unknown,
      ) => handler({ select, update }),
    };
    const service = new MembersService(db as never);

    const result = await service.updateMemberPermissions(
      'workspace-1',
      'membership-1',
      { canViewInvoices: true },
    );

    expect(updateSet).toHaveBeenCalledWith({ canViewInvoices: true });
    expect(result).toEqual({
      ...joinedRow,
      joinedAt: '2026-01-01T00:00:00.000Z',
      lastActiveAt: null,
    });
  });

  it('throws NotFound when the permissions target member does not exist', async () => {
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
    const update = vi.fn().mockReturnValue({ set: updateSet });
    const db = {
      transaction: async (
        handler: (tx: { select: unknown; update: unknown }) => unknown,
      ) => handler({ select: vi.fn(), update }),
    };
    const service = new MembersService(db as never);

    await expect(
      service.updateMemberPermissions('workspace-1', 'missing', {
        canViewInvoices: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(updateSet).toHaveBeenCalledWith({ canViewInvoices: true });
  });
});
