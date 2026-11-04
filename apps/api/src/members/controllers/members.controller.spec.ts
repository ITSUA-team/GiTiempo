import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembersController } from './members.controller';
import { MembersService } from '../services/members.service';

describe('MembersController', () => {
  let controller: MembersController;
  const membersService = {
    listMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    updateMemberPermissions: vi.fn(),
    removeMember: vi.fn(),
  };

  const adminUser = {
    sub: '11111111-1111-1111-1111-111111111111',
    email: 'admin@example.com',
    firebaseUid: 'admin-uid',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    role: 'admin' as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: membersService }],
    }).compile();
    controller = module.get(MembersController);
  });

  it('PATCH /members/:id/permissions forwards workspace, member id, and body', async () => {
    const fake = { id: '44444444-4444-4444-4444-444444444444' } as never;
    membersService.updateMemberPermissions.mockResolvedValue(fake);

    await expect(
      controller.updatePermissions(
        adminUser,
        '44444444-4444-4444-4444-444444444444',
        { canViewInvoices: true } as never,
      ),
    ).resolves.toBe(fake);
    expect(membersService.updateMemberPermissions).toHaveBeenCalledWith(
      adminUser.workspaceId,
      '44444444-4444-4444-4444-444444444444',
      { canViewInvoices: true },
    );
  });
});
