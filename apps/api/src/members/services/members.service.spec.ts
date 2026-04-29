import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MembersService } from './members.service';

function makeLockAndCountSelect(lockRows: unknown[], countRows: unknown[]) {
  const forFn = vi.fn().mockResolvedValue(lockRows);
  const lockFrom = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({ for: forFn }),
  });
  const lockCall = vi.fn().mockReturnValue({ from: lockFrom });

  const countWhere = vi.fn().mockResolvedValue(countRows);
  const countFrom = vi.fn().mockReturnValue({ where: countWhere });
  const countCall = vi.fn().mockReturnValue({ from: countFrom });

  return {
    select: vi
      .fn()
      .mockReturnValueOnce(lockCall())
      .mockReturnValueOnce(countCall()),
    forFn,
  };
}

function makeMembershipSelect(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { select: vi.fn().mockReturnValue({ from }) };
}

describe('MembersService', () => {
  it('prevents demoting the last workspace admin', async () => {
    const { select } = makeLockAndCountSelect(
      [{ id: 'admin-1' }],
      [{ value: 1 }],
    );
    const tx = { select };
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
    const { select } = makeLockAndCountSelect(
      [{ id: 'admin-1' }, { id: 'admin-2' }],
      [{ value: 2 }],
    );
    const tx = { select };
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

  it('acquires a FOR UPDATE lock on admin rows before counting', async () => {
    const { select, forFn } = makeLockAndCountSelect(
      [{ id: 'admin-1' }],
      [{ value: 2 }],
    );
    const tx = { select };
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

    await assertCanLoseAdminRole(tx, 'workspace-1', 'admin', 'member');

    expect(forFn).toHaveBeenCalledWith('update');
  });

  it('rejects role checks against the current database membership', async () => {
    const db = makeMembershipSelect([
      {
        id: 'membership-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        role: 'member',
      },
    ]);
    const service = new MembersService(db as never);

    await expect(
      service.requireRole('user-1', 'workspace-1', ['admin', 'pm']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
