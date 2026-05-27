import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthenticatedApiClient } from '@gitiempo/web-shared/http';

import { createAdminMembersClient } from './admin-members-client';

function createTestApiClient(fetchFn: typeof fetch) {
  return createAuthenticatedApiClient({
    apiBaseUrl: 'https://api.example.test',
    fetchFn,
    getToken: () => 'access-token',
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => 'access-token',
  });
}

describe('createAdminMembersClient', () => {
  const fetchFn = vi.fn<typeof fetch>();

  const client = createAdminMembersClient({
    apiClient: createTestApiClient(fetchFn),
  });

  beforeEach(() => {
    fetchFn.mockReset();
  });

  it('lists members with auth headers and parses enriched member fields', async () => {
    fetchFn.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            avatarUrl: null,
            displayName: 'Alex Admin',
            email: 'alex@example.com',
            id: '11111111-1111-4111-8111-111111111111',
            joinedAt: '2026-05-01T10:00:00.000Z',
            lastActiveAt: '2026-05-02T11:00:00.000Z',
            projectsAssignedCount: 3,
            role: 'admin',
            userId: '22222222-2222-4222-8222-222222222222',
            workspaceId: '33333333-3333-4333-8333-333333333333',
          },
        ]),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );

    const result = await client.listMembers();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/members',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'GET',
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        lastActiveAt: '2026-05-02T11:00:00.000Z',
        projectsAssignedCount: 3,
      }),
    ]);
  });

  it('creates invites with the expected path, payload, and parsed response', async () => {
    fetchFn.mockResolvedValue(
      new Response(
        JSON.stringify({
          createdAt: '2026-05-01T10:00:00.000Z',
          email: 'new-member@example.com',
          expiresAt: '2026-05-08T10:00:00.000Z',
          id: '44444444-4444-4444-8444-444444444444',
          invitedBy: '55555555-5555-4555-8555-555555555555',
          role: 'pm',
          status: 'pending',
          workspaceId: '33333333-3333-4333-8333-333333333333',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );

    const result = await client.createInvite({
      email: 'new-member@example.com',
      role: 'pm',
    });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/invites',
      expect.objectContaining({
        body: JSON.stringify({ email: 'new-member@example.com', role: 'pm' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      }),
    );
    expect(result.email).toBe('new-member@example.com');
  });

  it('surfaces API errors for destructive member removal', async () => {
    fetchFn.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Last admin cannot be removed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 409,
      }),
    );

    await expect(
      client.removeMember(
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toThrow('Last admin cannot be removed');

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.test/members/11111111-1111-4111-8111-111111111111',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
        method: 'DELETE',
      }),
    );
  });
});
