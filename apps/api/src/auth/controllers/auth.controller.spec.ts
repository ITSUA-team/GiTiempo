import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get(AuthController);
  });

  it('POST /auth/login delegates to AuthService.login', async () => {
    const pair = {
      accessToken: 'a',
      refreshToken: 'r',
      accessTokenExpiresIn: 900,
    };
    authService.login.mockResolvedValue(pair);
    await expect(
      controller.login({ firebaseIdToken: 'test:u:e@x.com' } as never),
    ).resolves.toBe(pair);
    expect(authService.login).toHaveBeenCalledWith('test:u:e@x.com');
  });

  it('POST /auth/refresh delegates to AuthService.refresh', async () => {
    const pair = {
      accessToken: 'a',
      refreshToken: 'r2',
      accessTokenExpiresIn: 900,
    };
    authService.refresh.mockResolvedValue(pair);
    await expect(
      controller.refresh({ refreshToken: 'raw' } as never),
    ).resolves.toBe(pair);
    expect(authService.refresh).toHaveBeenCalledWith('raw');
  });

  it('POST /auth/register delegates to AuthService.register', async () => {
    const pair = {
      accessToken: 'a',
      refreshToken: 'r1',
      accessTokenExpiresIn: 900,
    };
    authService.register.mockResolvedValue(pair);
    await expect(
      controller.register({
        email: 'owner@example.com',
        fullName: 'Owner Person',
        ownerAcknowledgement: true,
        password: 'password123',
        workspaceName: 'Acme Studio',
      } as never),
    ).resolves.toBe(pair);
    expect(authService.register).toHaveBeenCalledWith({
      email: 'owner@example.com',
      fullName: 'Owner Person',
      ownerAcknowledgement: true,
      password: 'password123',
      workspaceName: 'Acme Studio',
    });
  });

  it('POST /auth/logout passes subject + token to AuthService.logout', async () => {
    authService.logout.mockResolvedValue(undefined);
    await expect(
      controller.logout('user-1', { refreshToken: 'raw' } as never),
    ).resolves.toBeUndefined();
    expect(authService.logout).toHaveBeenCalledWith('raw', 'user-1');
  });
});
