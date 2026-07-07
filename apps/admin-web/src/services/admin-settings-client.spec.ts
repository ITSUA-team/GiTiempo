import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { createAdminSettingsClient } from './admin-settings-client';

const workspaceResponse = {
  createdAt: '2026-05-01T10:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'GiTiempo Studio',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

const settingsResponse = {
  createdAt: '2026-05-01T10:00:00.000Z',
  currency: 'USD',
  defaultHourlyRate: 120,
  id: '22222222-2222-4222-8222-222222222222',
  timeZone: 'UTC',
  updatedAt: '2026-05-01T10:00:00.000Z',
  workspaceId: '11111111-1111-4111-8111-111111111111',
};

const workspaceGitHubOrganizationResponse = {
  id: '33333333-3333-4333-8333-333333333333',
  workspaceId: '11111111-1111-4111-8111-111111111111',
  organizationLogin: 'Octo-Org',
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-05-01T10:00:00.000Z',
};

const githubConnectionResponse = {
  status: 'connected',
  account: {
    githubUserId: 'github-user-1',
    login: 'octocat',
    avatarUrl: 'https://avatars.example.test/octocat.png',
    connectedAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function createTestApiClient(fetchFn: typeof fetch) {
  return createAuthenticatedApiClient({
    apiBaseUrl: 'https://api.example.test',
    fetchFn,
    getToken: () => 'access-token',
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => 'access-token',
  });
}

describe('createAdminSettingsClient', () => {
  const fetchFn = vi.fn<typeof fetch>();

  const client = createAdminSettingsClient({
    apiClient: createTestApiClient(fetchFn),
  });

  beforeEach(() => {
    fetchFn.mockReset();
  });

  it('gets workspace with auth headers and parses the response', async () => {
    fetchFn.mockResolvedValue(jsonResponse(workspaceResponse));

    const result = await client.getWorkspace();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result).toEqual(workspaceResponse);
  });

  it('updates workspace with the expected path, method, and payload', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ ...workspaceResponse, name: 'Updated Workspace' }),
    );

    const result = await client.updateWorkspace({
      name: 'Updated Workspace',
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace',
      expect.objectContaining({
        body: JSON.stringify({ name: 'Updated Workspace' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
        method: 'PATCH',
      }),
    );
    expect(result.name).toBe('Updated Workspace');
  });

  it('gets workspace settings with auth headers and parses the response', async () => {
    fetchFn.mockResolvedValue(jsonResponse(settingsResponse));

    const result = await client.getWorkspaceSettings();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace/settings',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result).toEqual(settingsResponse);
  });

  it('lists workspace GitHub organizations with auth headers and parses the response', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ items: [workspaceGitHubOrganizationResponse] }),
    );

    const result = await client.listWorkspaceGitHubOrganizations();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace/github/organizations',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result.items).toEqual([workspaceGitHubOrganizationResponse]);
  });

  it('gets GitHub connection status with auth headers and parses the response', async () => {
    fetchFn.mockResolvedValue(jsonResponse(githubConnectionResponse));

    const result = await client.getGitHubConnectionStatus();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/github/connection',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result).toEqual(githubConnectionResponse);
  });

  it('adds a workspace GitHub organization with the expected path, method, and payload', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse(workspaceGitHubOrganizationResponse),
    );

    const result = await client.addWorkspaceGitHubOrganization({
      organizationLogin: 'Octo-Org',
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace/github/organizations',
      expect.objectContaining({
        body: JSON.stringify({ organizationLogin: 'Octo-Org' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      }),
    );
    expect(result.organizationLogin).toBe('Octo-Org');
  });

  it('removes a workspace GitHub organization with a no-content request', async () => {
    fetchFn.mockResolvedValue(new Response(null, { status: 204 }));

    await client.removeWorkspaceGitHubOrganization(
      '33333333-3333-4333-8333-333333333333',
    );

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace/github/organizations/33333333-3333-4333-8333-333333333333',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'DELETE',
      }),
    );
  });

  it('updates workspace settings with the expected payload shape', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({
        ...settingsResponse,
        currency: 'EUR',
        defaultHourlyRate: null,
        timeZone: 'Europe/Kyiv',
      }),
    );

    const result = await client.updateWorkspaceSettings({
      currency: 'EUR',
      defaultHourlyRate: null,
      timeZone: 'Europe/Kyiv',
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/workspace/settings',
      expect.objectContaining({
        body: JSON.stringify({
          currency: 'EUR',
          defaultHourlyRate: null,
          timeZone: 'Europe/Kyiv',
        }),
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
        method: 'PATCH',
      }),
    );
    expect(result.currency).toBe('EUR');
    expect(result.defaultHourlyRate).toBeNull();
    expect(result.timeZone).toBe('Europe/Kyiv');
  });

  it('rejects invalid response shapes', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ ...settingsResponse, currency: 'US' }),
    );

    await expect(client.getWorkspaceSettings()).rejects.toThrow();
  });

  it('rejects invalid GitHub connection response shapes', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ status: 'connected', account: null }),
    );

    await expect(client.getGitHubConnectionStatus()).rejects.toThrow();
  });

  it('rejects invalid update payloads before sending requests', async () => {
    await expect(client.updateWorkspaceSettings({})).rejects.toThrow(
      'At least one field must be provided',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects invalid add organization payloads before sending requests', async () => {
    let error: unknown;

    try {
      await client.addWorkspaceGitHubOrganization({
        organizationLogin: '   ',
      });
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(ZodError);
    expect((error as ZodError).issues[0]?.message).toBe(
      'Organization login is required',
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('surfaces API error messages using repository parsing order', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ error: 'Admin role required' }, 403),
    );

    await expect(client.getWorkspaceSettings()).rejects.toThrow(
      'Admin role required',
    );
  });
});
