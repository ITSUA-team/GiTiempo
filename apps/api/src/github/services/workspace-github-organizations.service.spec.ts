import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../auth/types/auth-user';
import { WorkspaceGitHubOrganizationsService } from './workspace-github-organizations.service';

const user: AuthUser = {
  sub: 'user-1',
  email: 'user@example.com',
  firebaseUid: 'firebase-1',
  workspaceId: 'workspace-1',
  role: 'admin',
};

const storedRow = {
  id: 'row-1',
  workspaceId: 'workspace-1',
  organizationLogin: 'Octo-Org',
  normalizedLogin: 'octo-org',
  createdByUserId: 'user-1',
  createdAt: new Date('2026-06-18T00:00:00Z'),
  updatedAt: new Date('2026-06-18T00:00:00Z'),
};

function createSelectLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

function createSelectOrderBy(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, orderBy };
}

describe('WorkspaceGitHubOrganizationsService', () => {
  it('lists workspace organization policy rows', async () => {
    const select = createSelectOrderBy([storedRow]);
    const db = {
      select: vi.fn().mockReturnValue({ from: select.from }),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      { status: vi.fn(), getValidAccessToken: vi.fn() } as never,
      { listOwners: vi.fn() } as never,
    );

    await expect(service.list('workspace-1')).resolves.toEqual({
      items: [
        {
          id: 'row-1',
          workspaceId: 'workspace-1',
          organizationLogin: 'Octo-Org',
          createdByUserId: 'user-1',
          createdAt: '2026-06-18T00:00:00.000Z',
        },
      ],
    });
  });

  it('adds an allowed organization after validating GitHub visibility', async () => {
    const existingLookup = createSelectLimit([]);
    const insertReturning = vi.fn().mockResolvedValue([storedRow]);
    const insertValues = vi
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    };
    const connections = {
      status: vi.fn().mockResolvedValue({
        status: 'connected',
        account: {
          githubUserId: '123',
          login: 'octocat',
          avatarUrl: null,
          connectedAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
        },
      }),
      getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
    };
    const apiClient = {
      listOwners: vi.fn().mockResolvedValue({
        items: [
          {
            login: 'Octo-Org',
            label: 'Octo-Org',
            type: 'organization',
            avatarUrl: null,
            url: 'https://github.com/Octo-Org',
          },
        ],
      }),
      listActiveOrganizationMemberships: vi.fn(),
      getAuthenticatedUserOrganizationMembership: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      connections as never,
      apiClient as never,
    );

    const result = await service.add(user, {
      organizationLogin: ' octo-org ',
    });

    expect(connections.getValidAccessToken).toHaveBeenCalledWith('user-1');
    expect(apiClient.listOwners).toHaveBeenCalledWith(
      'ghu_token',
      { login: 'octocat', avatarUrl: null },
      'organization',
    );
    expect(apiClient.listActiveOrganizationMemberships).not.toHaveBeenCalled();
    expect(
      apiClient.getAuthenticatedUserOrganizationMembership,
    ).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        organizationLogin: 'Octo-Org',
        normalizedLogin: 'octo-org',
        createdByUserId: 'user-1',
      }),
    );
    expect(result.organizationLogin).toBe('Octo-Org');
  });

  it('adds an organization found through exact active membership when owner listing omits it', async () => {
    const existingLookup = createSelectLimit([]);
    const insertReturning = vi.fn().mockResolvedValue([
      {
        ...storedRow,
        organizationLogin: 'My-test-org-for-clock',
        normalizedLogin: 'my-test-org-for-clock',
      },
    ]);
    const insertValues = vi
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    };
    const connections = {
      status: vi.fn().mockResolvedValue({
        status: 'connected',
        account: {
          githubUserId: '123',
          login: 'octocat',
          avatarUrl: null,
          connectedAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
        },
      }),
      getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
    };
    const apiClient = {
      listOwners: vi.fn().mockResolvedValue({ items: [] }),
      getAuthenticatedUserOrganizationMembership: vi.fn().mockResolvedValue({
        login: 'My-test-org-for-clock',
        avatarUrl: null,
        url: 'https://github.com/My-test-org-for-clock',
        state: 'active',
      }),
      listActiveOrganizationMemberships: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      connections as never,
      apiClient as never,
    );

    const result = await service.add(user, {
      organizationLogin: 'my-test-org-for-clock',
    });

    expect(
      apiClient.getAuthenticatedUserOrganizationMembership,
    ).toHaveBeenCalledWith('ghu_token', 'my-test-org-for-clock');
    expect(apiClient.listActiveOrganizationMemberships).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationLogin: 'My-test-org-for-clock',
        normalizedLogin: 'my-test-org-for-clock',
      }),
    );
    expect(result.organizationLogin).toBe('My-test-org-for-clock');
  });

  it('adds an organization found through listed active memberships when exact lookup misses', async () => {
    const existingLookup = createSelectLimit([]);
    const insertReturning = vi.fn().mockResolvedValue([
      {
        ...storedRow,
        organizationLogin: 'My-test-org-for-clock',
        normalizedLogin: 'my-test-org-for-clock',
      },
    ]);
    const insertValues = vi
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    };
    const connections = {
      status: vi.fn().mockResolvedValue({
        status: 'connected',
        account: {
          githubUserId: '123',
          login: 'octocat',
          avatarUrl: null,
          connectedAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
        },
      }),
      getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
    };
    const apiClient = {
      listOwners: vi.fn().mockResolvedValue({ items: [] }),
      getAuthenticatedUserOrganizationMembership: vi
        .fn()
        .mockResolvedValue(null),
      listActiveOrganizationMemberships: vi.fn().mockResolvedValue({
        items: [
          {
            login: 'My-test-org-for-clock',
            label: 'My-test-org-for-clock',
            type: 'organization',
            avatarUrl: null,
            url: 'https://github.com/My-test-org-for-clock',
          },
        ],
      }),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      connections as never,
      apiClient as never,
    );

    const result = await service.add(user, {
      organizationLogin: 'my-test-org-for-clock',
    });

    expect(apiClient.listActiveOrganizationMemberships).toHaveBeenCalledWith(
      'ghu_token',
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationLogin: 'My-test-org-for-clock',
        normalizedLogin: 'my-test-org-for-clock',
      }),
    );
    expect(result.organizationLogin).toBe('My-test-org-for-clock');
  });

  it('returns the existing row for duplicate casing without inserting again', async () => {
    const existingLookup = createSelectLimit([storedRow]);
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      { status: vi.fn(), getValidAccessToken: vi.fn() } as never,
      { listOwners: vi.fn() } as never,
    );

    const result = await service.add(user, {
      organizationLogin: 'octo-org',
    });

    expect(db.insert).not.toHaveBeenCalled();
    expect(result.id).toBe('row-1');
  });

  it('rejects add attempts when the admin is not connected to GitHub', async () => {
    const existingLookup = createSelectLimit([]);
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      {
        status: vi.fn().mockResolvedValue({
          status: 'disconnected',
          account: null,
        }),
        getValidAccessToken: vi.fn(),
      } as never,
      { listOwners: vi.fn() } as never,
    );

    await expect(
      service.add(user, { organizationLogin: 'octo-org' }),
    ).rejects.toMatchObject({
      message: 'Connect GitHub before adding an allowed organization',
      response: expect.objectContaining({
        code: 'workspace_github_organization_connection_required',
        recovery: {
          organizationLogin: 'octo-org',
          reason: 'workspace_github_organization_connection_required',
          steps: [
            { id: 'install', status: 'unknown' },
            { id: 'approve', status: 'action_required' },
            { id: 'reconnect', status: 'disconnected' },
            { id: 'retry', status: 'blocked' },
          ],
        },
      }),
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects add attempts when the organization is not visible to the connected admin', async () => {
    const existingLookup = createSelectLimit([]);
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      {
        status: vi.fn().mockResolvedValue({
          status: 'connected',
          account: {
            githubUserId: '123',
            login: 'octocat',
            avatarUrl: null,
            connectedAt: '2026-06-18T00:00:00.000Z',
            updatedAt: '2026-06-18T00:00:00.000Z',
          },
        }),
        getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
      } as never,
      {
        listOwners: vi.fn().mockResolvedValue({ items: [] }),
        getAuthenticatedUserOrganizationMembership: vi
          .fn()
          .mockResolvedValue(null),
        listActiveOrganizationMemberships: vi
          .fn()
          .mockResolvedValue({ items: [] }),
      } as never,
    );

    await expect(
      service.add(user, { organizationLogin: 'octo-org' }),
    ).rejects.toMatchObject({
      message: 'GitHub organization is not visible to your connected account',
      response: expect.objectContaining({
        code: 'workspace_github_organization_not_visible',
        recovery: {
          organizationLogin: 'octo-org',
          reason: 'workspace_github_organization_not_visible',
          steps: [
            { id: 'install', status: 'action_required' },
            { id: 'approve', status: 'action_required' },
            { id: 'reconnect', status: 'complete' },
            { id: 'retry', status: 'blocked' },
          ],
        },
      }),
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('maps blocked GitHub App membership validation to a stable recovery code', async () => {
    const existingLookup = createSelectLimit([]);
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      {
        status: vi.fn().mockResolvedValue({
          status: 'connected',
          account: {
            githubUserId: '123',
            login: 'octocat',
            avatarUrl: null,
            connectedAt: '2026-06-18T00:00:00.000Z',
            updatedAt: '2026-06-18T00:00:00.000Z',
          },
        }),
        getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
      } as never,
      {
        listOwners: vi.fn().mockResolvedValue({ items: [] }),
        getAuthenticatedUserOrganizationMembership: vi.fn().mockRejectedValue(
          new BadRequestException({
            code: 'github_app_access_blocked',
            error: 'BadRequest',
            message: 'GitHub organization blocks this GitHub App',
          }),
        ),
        listActiveOrganizationMemberships: vi.fn(),
      } as never,
    );

    await expect(
      service.add(user, { organizationLogin: 'octo-org' }),
    ).rejects.toMatchObject({
      message: 'GitHub organization blocks this GitHub App',
      response: expect.objectContaining({
        code: 'workspace_github_organization_app_access_blocked',
        recovery: {
          organizationLogin: 'octo-org',
          reason: 'workspace_github_organization_app_access_blocked',
          steps: [
            { id: 'install', status: 'complete' },
            { id: 'approve', status: 'blocked' },
            { id: 'reconnect', status: 'action_required' },
            { id: 'retry', status: 'blocked' },
          ],
        },
      }),
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('maps retryable GitHub provider failures to a stable recovery code', async () => {
    const existingLookup = createSelectLimit([]);
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      {
        status: vi.fn().mockResolvedValue({
          status: 'connected',
          account: {
            githubUserId: '123',
            login: 'octocat',
            avatarUrl: null,
            connectedAt: '2026-06-18T00:00:00.000Z',
            updatedAt: '2026-06-18T00:00:00.000Z',
          },
        }),
        getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
      } as never,
      {
        listOwners: vi
          .fn()
          .mockRejectedValue(
            new ServiceUnavailableException('GitHub API request failed'),
          ),
      } as never,
    );

    await expect(
      service.add(user, { organizationLogin: 'octo-org' }),
    ).rejects.toMatchObject({
      message:
        'GitHub organization validation is temporarily unavailable. Try again.',
      response: expect.objectContaining({
        code: 'workspace_github_organization_provider_retryable',
        recovery: {
          organizationLogin: 'octo-org',
          reason: 'workspace_github_organization_provider_retryable',
          steps: [
            { id: 'install', status: 'unknown' },
            { id: 'approve', status: 'action_required' },
            { id: 'reconnect', status: 'complete' },
            { id: 'retry', status: 'ready' },
          ],
        },
      }),
    });
  });

  it('maps unclassified provider bad requests to the generic retryable recovery payload', async () => {
    const existingLookup = createSelectLimit([]);
    const db = {
      select: vi.fn().mockReturnValue({ from: existingLookup.from }),
      insert: vi.fn(),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      {
        status: vi.fn().mockResolvedValue({
          status: 'connected',
          account: {
            githubUserId: '123',
            login: 'octocat',
            avatarUrl: null,
            connectedAt: '2026-06-18T00:00:00.000Z',
            updatedAt: '2026-06-18T00:00:00.000Z',
          },
        }),
        getValidAccessToken: vi.fn().mockResolvedValue('ghu_token'),
      } as never,
      {
        listOwners: vi.fn().mockRejectedValue(
          new BadRequestException({
            code: 'github_unknown_bad_request',
            error: 'BadRequest',
            message: 'Raw provider detail that should stay server-side',
          }),
        ),
      } as never,
    );

    await expect(
      service.add(user, { organizationLogin: 'octo-org' }),
    ).rejects.toMatchObject({
      message:
        'GitHub organization validation is temporarily unavailable. Try again.',
      response: expect.objectContaining({
        code: 'workspace_github_organization_provider_retryable',
        recovery: {
          organizationLogin: 'octo-org',
          reason: 'workspace_github_organization_provider_retryable',
          steps: [
            { id: 'install', status: 'unknown' },
            { id: 'approve', status: 'action_required' },
            { id: 'reconnect', status: 'complete' },
            { id: 'retry', status: 'ready' },
          ],
        },
      }),
    });
  });

  it('scopes remove operations to the current workspace', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const db = {
      delete: vi.fn().mockReturnValue({ where }),
    };
    const service = new WorkspaceGitHubOrganizationsService(
      db as never,
      { status: vi.fn(), getValidAccessToken: vi.fn() } as never,
      { listOwners: vi.fn() } as never,
    );

    await expect(
      service.remove('workspace-1', 'row-1'),
    ).resolves.toBeUndefined();
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('treats organization allow-list matching as case-insensitive', async () => {
    const allowedLookup = createSelectLimit([storedRow]);
    const disallowedLookup = createSelectLimit([]);
    const serviceWithAllowedRow = new WorkspaceGitHubOrganizationsService(
      {
        select: vi.fn().mockReturnValue({ from: allowedLookup.from }),
      } as never,
      { status: vi.fn(), getValidAccessToken: vi.fn() } as never,
      { listOwners: vi.fn() } as never,
    );
    const serviceWithMissingRow = new WorkspaceGitHubOrganizationsService(
      {
        select: vi.fn().mockReturnValue({ from: disallowedLookup.from }),
      } as never,
      { status: vi.fn(), getValidAccessToken: vi.fn() } as never,
      { listOwners: vi.fn() } as never,
    );

    await expect(
      serviceWithAllowedRow.assertOrganizationAllowed(
        'workspace-1',
        'octo-org',
      ),
    ).resolves.toBeUndefined();
    await expect(
      serviceWithMissingRow.assertOrganizationAllowed(
        'workspace-1',
        'other-org',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
