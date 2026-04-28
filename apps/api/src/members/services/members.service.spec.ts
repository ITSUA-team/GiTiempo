import { ConflictException } from '@nestjs/common';
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
});
