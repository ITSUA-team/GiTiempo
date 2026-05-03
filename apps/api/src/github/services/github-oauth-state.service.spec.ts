import { describe, expect, it, vi } from 'vitest';
import { GithubOauthStateService } from './github-oauth-state.service';

describe('GithubOauthStateService', () => {
  it('creates opaque state with PKCE challenge', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const service = new GithubOauthStateService({ insert } as never);

    const created = await service.create('user-1');

    expect(created.state).toHaveLength(43);
    expect(created.codeChallenge).toHaveLength(43);
    expect(insert).toHaveBeenCalled();
    expect(values.mock.calls[0]![0]).toMatchObject({ userId: 'user-1' });
    expect(values.mock.calls[0]![0].codeVerifier).toHaveLength(43);
  });

  it('claims state atomically with update returning', async () => {
    const row = { id: 'state-row', userId: 'user-1' };
    const returning = vi.fn().mockResolvedValue([row]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const service = new GithubOauthStateService({ update } as never);

    await expect(service.claim('opaque')).resolves.toBe(row);
    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ consumedAt: expect.any(Date) });
    expect(where).toHaveBeenCalled();
    expect(returning).toHaveBeenCalled();
  });

  it('returns null when atomic claim does not match a row', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const service = new GithubOauthStateService({ update } as never);

    await expect(service.claim('expired')).resolves.toBeNull();
  });
});
