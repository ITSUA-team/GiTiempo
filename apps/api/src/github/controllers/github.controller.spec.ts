import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubController } from './github.controller';
import { GithubService } from '../services/github.service';

describe('GithubController', () => {
  let controller: GithubController;
  const githubService = {
    connectionStatus: vi.fn(),
    authUrl: vi.fn(),
    completeCallback: vi.fn(),
    disconnect: vi.fn(),
  };
  const user = {
    sub: 'user-1',
    email: 'user@example.com',
    firebaseUid: 'firebase-1',
    workspaceId: 'workspace-1',
    role: 'admin' as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [{ provide: GithubService, useValue: githubService }],
    }).compile();
    controller = module.get(GithubController);
  });

  it('GET /github/connection delegates to service', async () => {
    const status = { status: 'disconnected', account: null };
    githubService.connectionStatus.mockResolvedValue(status);

    await expect(controller.connectionStatus(user)).resolves.toBe(status);
    expect(githubService.connectionStatus).toHaveBeenCalledWith(user);
  });

  it('GET /github/auth-url delegates to service', async () => {
    const response = { authorizationUrl: 'https://github.com/login/oauth' };
    githubService.authUrl.mockResolvedValue(response);

    await expect(controller.authUrl(user)).resolves.toBe(response);
    expect(githubService.authUrl).toHaveBeenCalledWith(user);
  });

  it('GET /github/callback redirects to service URL', async () => {
    githubService.completeCallback.mockResolvedValue(
      'http://localhost:5173/profile?github=connected',
    );
    const response = { redirect: vi.fn() };

    await controller.callback('code', 'state', undefined, response as never);

    expect(githubService.completeCallback).toHaveBeenCalledWith({
      code: 'code',
      state: 'state',
      error: undefined,
    });
    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'http://localhost:5173/profile?github=connected',
    );
  });

  it('DELETE /github/connection delegates to service', async () => {
    githubService.disconnect.mockResolvedValue(undefined);

    await expect(controller.disconnect(user)).resolves.toBeUndefined();
    expect(githubService.disconnect).toHaveBeenCalledWith(user);
  });
});
