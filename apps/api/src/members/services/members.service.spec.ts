import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MembersService } from './members.service';

function makeSelect(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return vi.fn().mockReturnValue({ from });
}

describe('MembersService', () => {
  it('prevents demoting the last workspace admin', async () => {
    const tx = { select: makeSelect([{ value: 1 }]) };
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
});
