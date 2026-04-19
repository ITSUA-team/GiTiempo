import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    findCurrent: vi.fn(),
    updateCurrent: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = module.get(UsersController);
  });

  it('GET /users/me delegates to UsersService.findCurrent', async () => {
    const fake = { id: 'x' } as never;
    usersService.findCurrent.mockResolvedValue(fake);
    await expect(controller.getMe()).resolves.toBe(fake);
    expect(usersService.findCurrent).toHaveBeenCalledOnce();
  });

  it('PATCH /users/me forwards body to UsersService.updateCurrent', async () => {
    const fake = { id: 'x' } as never;
    usersService.updateCurrent.mockResolvedValue(fake);
    await expect(
      controller.updateMe({ displayName: 'New' } as never),
    ).resolves.toBe(fake);
    expect(usersService.updateCurrent).toHaveBeenCalledWith({
      displayName: 'New',
    });
  });
});
