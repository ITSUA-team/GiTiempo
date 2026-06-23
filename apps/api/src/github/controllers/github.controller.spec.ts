import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GithubController } from './github.controller';
import { GithubService } from '../services/github.service';

describe('GithubController', () => {
  let controller: GithubController;
  const githubService = {
    connectionStatus: vi.fn(),
    authUrl: vi.fn(),
    listOwners: vi.fn(),
    listRepositories: vi.fn(),
    listProjects: vi.fn(),
    getProjectOwner: vi.fn(),
    listRepositoryIssues: vi.fn(),
    listProjectIssues: vi.fn(),
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

  it('GET /github/owners delegates to service', async () => {
    const query = { type: 'all' as const };
    const response = { items: [] };
    githubService.listOwners.mockResolvedValue(response);

    await expect(controller.listOwners(user, query)).resolves.toBe(response);
    expect(githubService.listOwners).toHaveBeenCalledWith(user, query);
  });

  it('GET /github/repos delegates to service', async () => {
    const query = { ownerType: 'personal' as const, limit: 30 };
    const response = {
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
    };
    githubService.listRepositories.mockResolvedValue(response);

    await expect(controller.listRepositories(user, query)).resolves.toBe(
      response,
    );
    expect(githubService.listRepositories).toHaveBeenCalledWith(user, query);
  });

  it('GET /github/projects delegates to service', async () => {
    const query = {
      ownerType: 'organization' as const,
      owner: 'octo',
      limit: 30,
    };
    const response = {
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
    };
    githubService.listProjects.mockResolvedValue(response);

    await expect(controller.listProjects(user, query)).resolves.toBe(response);
    expect(githubService.listProjects).toHaveBeenCalledWith(user, query);
  });

  it('GET /github/repos/:owner/:repo/issues delegates to service', async () => {
    const query = { state: 'all' as const, limit: 30, q: 'timer' };
    const response = {
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
    };
    githubService.listRepositoryIssues.mockResolvedValue(response);

    await expect(
      controller.listRepositoryIssues(user, 'octo', 'repo', query),
    ).resolves.toBe(response);
    expect(githubService.listRepositoryIssues).toHaveBeenCalledWith(
      user,
      'octo',
      'repo',
      query,
    );
  });

  it('GET /github/projects/:projectId/issues delegates to service', async () => {
    const query = { state: 'open' as const, limit: 30 };
    const response = {
      items: [],
      pagination: { limit: 30, hasNextPage: false, nextPageToken: null },
      skipped: { pullRequests: 0, draftIssues: 0, redacted: 0, unknown: 0 },
    };
    githubService.listProjectIssues.mockResolvedValue(response);

    await expect(
      controller.listProjectIssues(user, 'PVT_kwDO', query),
    ).resolves.toBe(response);
    expect(githubService.listProjectIssues).toHaveBeenCalledWith(
      user,
      'PVT_kwDO',
      query,
    );
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
