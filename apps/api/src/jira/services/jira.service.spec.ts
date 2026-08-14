import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JiraService } from './jira.service';

describe('JiraService callback', () => {
  let connections: { upsertConnected: ReturnType<typeof vi.fn> };
  let oauthClient: {
    buildAuthorizationUrl: ReturnType<typeof vi.fn>;
    exchangeCode: ReturnType<typeof vi.fn>;
    getCurrentUser: ReturnType<typeof vi.fn>;
    listAccessibleSites: ReturnType<typeof vi.fn>;
  };
  let states: {
    claim: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    connections = { upsertConnected: vi.fn(async () => undefined) };
    oauthClient = {
      buildAuthorizationUrl: vi.fn(
        () => 'https://auth.atlassian.com/authorize',
      ),
      exchangeCode: vi.fn(async () => ({
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenExpiresAt: new Date(),
      })),
      getCurrentUser: vi.fn(async () => ({
        atlassianAccountId: 'acc-1',
        displayName: 'Alexey',
        email: null,
        avatarUrl: null,
      })),
      listAccessibleSites: vi.fn(async () => [
        { cloudId: 'cloud-1', name: 'ITSUA', url: 'https://itsua.net' },
      ]),
    };
    states = {
      claim: vi.fn(async () => ({ userId: 'user-1' })),
      create: vi.fn(async () => ({ state: 'state-1' })),
    };
  });

  function createService() {
    return new JiraService(
      { get: () => 'https://app.example.test' } as never,
      connections as never,
      oauthClient as never,
      states as never,
    );
  }

  it('stores the connection with the sites the account can reach', async () => {
    const redirect = await createService().completeCallback({
      code: 'code-1',
      state: 'state-1',
    });

    expect(connections.upsertConnected).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ atlassianAccountId: 'acc-1' }),
      expect.objectContaining({ accessToken: 'access' }),
      [{ cloudId: 'cloud-1', name: 'ITSUA', url: 'https://itsua.net' }],
    );
    expect(redirect).toContain('jira=connected');
  });

  it('writes nothing when the state was already used or expired', async () => {
    states.claim.mockResolvedValue(null);

    const redirect = await createService().completeCallback({
      code: 'code-1',
      state: 'replayed',
    });

    expect(oauthClient.exchangeCode).not.toHaveBeenCalled();
    expect(connections.upsertConnected).not.toHaveBeenCalled();
    expect(redirect).toContain('code=invalid_state');
  });

  it('reports a denied authorization without touching the connection', async () => {
    const redirect = await createService().completeCallback({
      error: 'access_denied',
    });

    expect(states.claim).not.toHaveBeenCalled();
    expect(connections.upsertConnected).not.toHaveBeenCalled();
    expect(redirect).toContain('code=jira_denied');
  });

  it('reports missing configuration distinctly from an exchange failure', async () => {
    oauthClient.exchangeCode.mockRejectedValue(
      new Error('Jira integration is not configured'),
    );

    await expect(
      createService().completeCallback({ code: 'code-1', state: 'state-1' }),
    ).resolves.toContain('code=jira_config');
  });

  it('never returns a destination taken from the request', async () => {
    const redirect = await createService().completeCallback({
      code: 'code-1',
      state: 'state-1',
    });

    expect(redirect.startsWith('https://app.example.test/profile')).toBe(true);
  });
});
