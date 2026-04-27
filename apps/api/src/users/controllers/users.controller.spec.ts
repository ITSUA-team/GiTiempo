import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    findById: vi.fn(),
    updateById: vi.fn(),
  };

  const sub = '11111111-1111-1111-1111-111111111111';
  const user = {
    sub,
    email: 'admin@example.com',
    firebaseUid: 'admin-uid',
    workspaceId: '22222222-2222-2222-2222-222222222222',
    role: 'admin' as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = module.get(UsersController);
  });

  it('GET /users/me delegates to UsersService.findById with the subject', async () => {
    const fake = { id: sub } as never;
    usersService.findById.mockResolvedValue(fake);
    await expect(controller.getMe(user)).resolves.toBe(fake);
    expect(usersService.findById).toHaveBeenCalledWith(sub, user.workspaceId);
  });

  it('PATCH /users/me forwards subject + body to UsersService.updateById', async () => {
    const fake = { id: sub } as never;
    usersService.updateById.mockResolvedValue(fake);
    await expect(
      controller.updateMe(user, { displayName: 'New' } as never),
    ).resolves.toBe(fake);
    expect(usersService.updateById).toHaveBeenCalledWith(
      sub,
      user.workspaceId,
      {
        displayName: 'New',
      },
    );
  });
});
