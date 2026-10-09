import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/db.constants';
import type { DrizzleDB } from '../src/db/db.types';
import {
  githubAccountLinks,
  githubConnections,
  githubOauthGrants,
  users,
  workspaceMembers,
  workspaces,
} from '../src/db/schema';
import {
  GithubAccountIdentityMismatchError,
  GithubAccountLinkConflictError,
  GithubAccountService,
} from '../src/github/services/github-account.service';
import { GithubConnectionsService } from '../src/github/services/github-connections.service';
import { FIREBASE_ADMIN } from '../src/auth/services/firebase-admin.interface';
import type { FakeFirebaseAdminService } from '../src/auth/services/firebase-admin.fake';
import { TokenService } from '../src/auth/services/token.service';
import { GithubAccountOauthClientService } from '../src/github/services/github-account-oauth-client.service';
import { GithubOauthClientService } from '../src/github/services/github-oauth-client.service';

describe('GitHub account credential storage (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let accounts: GithubAccountService;
  let connections: GithubConnectionsService;
  let firebase: FakeFirebaseAdminService;
  let workspaceId: string;
  const userIds = [randomUUID(), randomUUID()];
  const profile = {
    githubUserId: `e2e-${randomUUID()}`,
    login: 'account-link-e2e',
    avatarUrl: null,
  };
  const tokens = {
    accessToken: 'oauth-access',
    refreshToken: 'oauth-refresh',
    tokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scopes: ['user:email', 'read:org', 'read:project'],
  };

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    return { promise, resolve, reject };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
    accounts = app.get(GithubAccountService);
    connections = app.get(GithubConnectionsService);
    firebase = app.get(FIREBASE_ADMIN);
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: `GitHub credential e2e ${randomUUID()}` })
      .returning();
    workspaceId = workspace!.id;
    await db.insert(users).values(
      userIds.map((id, index) => ({
        id,
        firebaseUid: `github-account-e2e-${id}`,
        email: `github-account-${index}-${id}@example.test`,
        displayName: 'GitHub Account E2E',
      })),
    );
    await db.insert(workspaceMembers).values(
      userIds.map((userId) => ({
        workspaceId,
        userId,
        role: 'admin' as const,
      })),
    );
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(
      (
        accounts as unknown as {
          oauthClient: { revoke: () => Promise<boolean> };
        }
      ).oauthClient,
      'revoke',
    ).mockResolvedValue(false);
    vi.spyOn(
      (
        accounts as unknown as {
          appOauthClient: { revoke: () => Promise<boolean> };
        }
      ).appOauthClient,
      'revoke',
    ).mockResolvedValue(false);
  });
  afterAll(async () => {
    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    await db.delete(users).where(eq(users.id, userIds[0]!));
    await db.delete(users).where(eq(users.id, userIds[1]!));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await app.close();
  });

  it('serializes ownership, rejects identity replacement, and invalidates stale App writes', async () => {
    const version = await accounts.getVersion(userIds[0]!);
    await accounts.saveOAuth(
      userIds[0]!,
      profile,
      tokens,
      version.generation,
      new Date(),
    );
    const secondVersion = await accounts.getVersion(userIds[1]!);
    await expect(
      accounts.saveOAuth(
        userIds[1]!,
        profile,
        tokens,
        secondVersion.generation,
        new Date(),
      ),
    ).rejects.toThrow(GithubAccountLinkConflictError);
    await expect(
      accounts.saveOAuth(
        userIds[0]!,
        { ...profile, githubUserId: `${profile.githubUserId}-other` },
        tokens,
        version.generation,
        new Date(),
      ),
    ).rejects.toThrow(GithubAccountIdentityMismatchError);
    await accounts.invalidatePendingAuthorizations(userIds[0]!);
    await expect(
      connections.upsertConnected(
        userIds[0]!,
        profile,
        {
          accessToken: 'app-access',
          refreshToken: 'app-refresh',
          tokenExpiresAt: new Date(Date.now() + 60_000),
          refreshTokenExpiresAt: new Date(Date.now() + 120_000),
        },
        { generation: version.generation, startedAt: new Date() },
      ),
    ).rejects.toThrow();
  });

  it('rolls back a linked OAuth grant when the atomic continuation fails', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    const rollbackProfile = {
      ...profile,
      githubUserId: `${profile.githubUserId}-rollback`,
    };
    await expect(
      accounts.saveOAuthAndRun(
        userId,
        rollbackProfile,
        tokens,
        version.generation,
        new Date(),
        async () => {
          throw new Error('session persistence failed');
        },
      ),
    ).rejects.toThrow('session persistence failed');
    const [link] = await db
      .select()
      .from(githubAccountLinks)
      .where(
        and(
          eq(githubAccountLinks.userId, userId),
          eq(githubAccountLinks.githubUserId, rollbackProfile.githubUserId),
        ),
      )
      .limit(1);
    expect(link).toBeUndefined();
  });

  it('blocks disconnect without an alternative login and preserves both credential families', async () => {
    const userId = userIds[0]!;
    const current = await accounts.getVersion(userId);
    await connections.upsertConnected(
      userId,
      profile,
      {
        accessToken: 'app-access',
        refreshToken: 'app-refresh',
        tokenExpiresAt: new Date(Date.now() + 120_000),
        refreshTokenExpiresAt: new Date(Date.now() + 240_000),
      },
      { generation: current.generation, startedAt: new Date() },
    );
    firebase.setAlternativeProviders(`github-account-e2e-${userId}`, []);
    await expect(accounts.disconnect(userId)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'github_alternative_signin_required',
      }),
    });
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      ).length,
    ).toBe(1);
    expect((await db.select().from(githubOauthGrants)).length).toBeGreaterThan(
      0,
    );
    expect(
      (
        await db
          .select()
          .from(githubConnections)
          .where(eq(githubConnections.userId, userId))
      ).length,
    ).toBe(1);
    firebase.setAlternativeProviders(`github-account-e2e-${userId}`, [
      'password',
    ]);
  });

  it('fully unlinks idempotently, releases the identity, and preserves membership', async () => {
    const userId = userIds[0]!;
    await expect(accounts.disconnect(userId)).resolves.toMatchObject({
      disconnected: true,
    });
    await expect(accounts.disconnect(userId)).resolves.toEqual({
      disconnected: true,
      providerRevocation: 'not_required',
    });
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      ).length,
    ).toBe(0);
    expect(
      (
        await db
          .select()
          .from(githubConnections)
          .where(eq(githubConnections.userId, userId))
      ).length,
    ).toBe(0);
    expect(
      (
        await db
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.userId, userId))
      ).length,
    ).toBe(1);
    const version = await accounts.getVersion(userIds[1]!);
    await expect(
      accounts.saveOAuth(
        userIds[1]!,
        profile,
        tokens,
        version.generation,
        new Date(),
      ),
    ).resolves.toMatchObject({ userId: userIds[1] });
  });

  it('does not let a stale rejected-token report erase a newer OAuth grant', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    await accounts.saveOAuth(
      userId,
      profile,
      { ...tokens, accessToken: 'new-access' },
      version.generation,
      new Date(),
    );
    await accounts.invalidateOAuthAccess(userId, 'old-access');
    await expect(accounts.getValidAccessToken(userId)).resolves.toBe(
      'new-access',
    );
    await accounts.invalidateOAuthAccess(userId, 'new-access');
    await expect(accounts.getValidAccessToken(userId)).rejects.toThrow();
  });

  it('fails closed when alternative-login verification is unavailable without mutating the link', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    await accounts.saveOAuth(
      userId,
      profile,
      { ...tokens, accessToken: 'verification-access' },
      version.generation,
      new Date(),
    );
    const failure = vi
      .spyOn(firebase, 'hasUsableAlternativeLogin')
      .mockRejectedValueOnce(new Error('firebase unavailable'));
    await expect(accounts.disconnect(userId)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'github_disconnect_verification_unavailable',
      }),
    });
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      ).length,
    ).toBe(1);
    failure.mockRestore();
  });

  it('does not resurrect OAuth or App credentials when delayed refresh loses to disconnect', async () => {
    const userId = userIds[1]!;
    const current = await accounts.getVersion(userId);
    await accounts.saveOAuth(
      userId,
      profile,
      {
        ...tokens,
        accessToken: 'expired-oauth',
        tokenExpiresAt: new Date(Date.now() - 1_000),
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      },
      current.generation,
      new Date(),
    );
    const oauthGate = deferred<typeof tokens>();
    const accountClient = (
      accounts as unknown as {
        oauthClient: { refresh: (token: string) => Promise<typeof tokens> };
      }
    ).oauthClient;
    const oauthRefresh = vi
      .spyOn(accountClient, 'refresh')
      .mockReturnValueOnce(oauthGate.promise);
    const oauthPending = accounts.getValidAccessToken(userId);
    await vi.waitFor(() => expect(oauthRefresh).toHaveBeenCalled());
    await accounts.disconnect(userId);
    oauthGate.resolve({ ...tokens, accessToken: 'late-oauth' });
    await expect(oauthPending).rejects.toThrow();
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      ).length,
    ).toBe(0);
    oauthRefresh.mockRestore();

    const version = await accounts.getVersion(userId);
    await accounts.saveOAuth(
      userId,
      profile,
      tokens,
      version.generation,
      new Date(),
    );
    await connections.upsertConnected(
      userId,
      profile,
      {
        accessToken: 'expired-app',
        refreshToken: 'app-refresh',
        tokenExpiresAt: new Date(Date.now() - 1_000),
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    const appGate = deferred<{
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: Date;
      refreshTokenExpiresAt: Date;
    }>();
    const appClient = (
      connections as unknown as {
        oauthClient: { refresh: (token: string) => Promise<unknown> };
      }
    ).oauthClient;
    const appRefresh = vi
      .spyOn(appClient, 'refresh')
      .mockReturnValueOnce(appGate.promise);
    const appPending = connections.getValidAccessToken(userId);
    await vi.waitFor(() => expect(appRefresh).toHaveBeenCalled());
    await accounts.disconnect(userId);
    appGate.resolve({
      accessToken: 'late-app',
      refreshToken: 'late-refresh',
      tokenExpiresAt: new Date(Date.now() + 60_000),
      refreshTokenExpiresAt: new Date(Date.now() + 120_000),
    });
    await expect(appPending).rejects.toThrow();
    expect(
      (
        await db
          .select()
          .from(githubConnections)
          .where(eq(githubConnections.userId, userId))
      ).length,
    ).toBe(0);
    appRefresh.mockRestore();
  });

  it('handles concurrent OAuth callbacks as one global identity claim', async () => {
    const concurrent = {
      ...profile,
      githubUserId: `concurrent-${randomUUID()}`,
    };
    const versions = await Promise.all(
      userIds.map((id) => accounts.getVersion(id)),
    );
    const results = await Promise.allSettled(
      userIds.map((userId, index) =>
        accounts.saveOAuth(
          userId,
          concurrent,
          tokens,
          versions[index]!.generation,
          new Date(),
        ),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('removes only a permanently rejected expired OAuth grant and exposes reauthorization', async () => {
    const userId = userIds[1]!;
    await Promise.all(userIds.map((id) => accounts.disconnect(id)));
    const version = await accounts.getVersion(userId);
    const rejected = { ...profile, githubUserId: `rejected-${randomUUID()}` };
    await accounts.saveOAuth(
      userId,
      rejected,
      {
        ...tokens,
        accessToken: 'expired-rejected',
        tokenExpiresAt: new Date(Date.now() - 1_000),
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      },
      version.generation,
      new Date(),
    );
    await connections.upsertConnected(
      userId,
      rejected,
      {
        accessToken: 'preserved-app-access',
        refreshToken: 'preserved-app-refresh',
        tokenExpiresAt: new Date(Date.now() + 120_000),
        refreshTokenExpiresAt: new Date(Date.now() + 240_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    const client = (
      accounts as unknown as { oauthClient: { refresh: () => Promise<never> } }
    ).oauthClient;
    vi.spyOn(client, 'refresh').mockRejectedValueOnce(
      new UnauthorizedException(),
    );
    await expect(accounts.getValidAccessToken(userId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(accounts.status(userId)).resolves.toMatchObject({
      status: 'connected',
      oauth: { status: 'not_authorized' },
      capabilities: {
        organizationDiscovery: 'authorization_required',
        personalData: 'ready',
      },
    });
    await expect(connections.getValidAccessToken(userId)).resolves.toBe(
      'preserved-app-access',
    );
  });

  it('finishes local unlink when provider revocation times out', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    const [link] = await db
      .select()
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.userId, userId))
      .limit(1);
    await accounts.saveOAuth(
      userId,
      {
        githubUserId: link!.githubUserId,
        login: link!.login,
        avatarUrl: link!.avatarUrl,
      },
      tokens,
      version.generation,
      new Date(),
    );
    const client = (
      accounts as unknown as { oauthClient: { revoke: () => Promise<boolean> } }
    ).oauthClient;
    vi.spyOn(client, 'revoke').mockRejectedValueOnce(
      new DOMException('timeout'),
    );
    await expect(accounts.disconnect(userId)).resolves.toEqual({
      disconnected: true,
      providerRevocation: 'unconfirmed',
    });
    expect(
      (
        await db
          .select()
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      ).length,
    ).toBe(0);
  });

  it('rechecks the initiating session after provider work before committing an account link', async () => {
    const userId = userIds[1]!;
    const tokenService = app.get(TokenService);
    const client = app.get(GithubAccountOauthClientService);
    vi.spyOn(client, 'buildAuthorizationUrl').mockImplementation(
      ({ state }) => {
        const url = new URL('https://github.example.test/authorize');
        url.searchParams.set('state', state);
        return url.toString();
      },
    );
    const sessionToken = tokenService.signAccess({
      sub: userId,
      workspaceId,
      role: 'admin',
      email: `github-account-1-${userId}@example.test`,
      firebaseUid: `github-account-e2e-${userId}`,
    });
    const { authorizationUrl } = await accounts.createAuthorization(
      userId,
      sessionToken,
    );
    const state = new URL(authorizationUrl).searchParams.get('state')!;
    vi.spyOn(client, 'exchangeCode').mockResolvedValue(tokens);
    vi.spyOn(client, 'getCurrentUser').mockImplementation(async () => {
      vi.spyOn(tokenService, 'verifyAccess').mockImplementation(() => {
        throw new UnauthorizedException(
          'Session expired during provider exchange',
        );
      });
      return { ...profile, githubUserId: `expired-session-${randomUUID()}` };
    });
    const result = new URL(
      await accounts.completeCallback({
        code: 'synthetic-code',
        state,
        sessionToken,
      }),
    );
    expect(result.searchParams.get('code')).toBe('invalid_state');
    expect(
      (
        await db
          .select({ id: githubAccountLinks.id })
          .from(githubAccountLinks)
          .where(eq(githubAccountLinks.userId, userId))
      ).length,
    ).toBe(0);
  });

  it('cleans inactive legacy App history without requiring a provider lookup', async () => {
    const userId = userIds[1]!;
    await db.insert(githubConnections).values({
      userId,
      githubUserId: 'inactive-legacy',
      login: 'legacy',
      connected: false,
    });
    const lookup = vi
      .spyOn(firebase, 'hasUsableAlternativeLogin')
      .mockRejectedValue(new Error('must not look up'));
    await expect(accounts.disconnect(userId)).resolves.toEqual({
      disconnected: true,
      providerRevocation: 'not_required',
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(
      (
        await db
          .select({ id: githubConnections.id })
          .from(githubConnections)
          .where(eq(githubConnections.userId, userId))
      ).length,
    ).toBe(0);
  });

  it('preserves a newer OAuth grant when stale refresh succeeds at an identical timestamp', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    const reconnectProfile = {
      ...profile,
      githubUserId: `timestamp-${randomUUID()}`,
    };
    const link = await accounts.saveOAuth(
      userId,
      reconnectProfile,
      {
        ...tokens,
        tokenExpiresAt: new Date(Date.now() - 1_000),
      },
      version.generation,
      new Date(),
    );
    const [previous] = await db
      .select({ updatedAt: githubOauthGrants.updatedAt })
      .from(githubOauthGrants)
      .where(eq(githubOauthGrants.accountLinkId, link.id));
    const gate = deferred<typeof tokens>();
    const started = deferred<void>();
    vi.spyOn(
      app.get(GithubAccountOauthClientService),
      'refresh',
    ).mockImplementation(() => {
      started.resolve();
      return gate.promise;
    });
    const pending = accounts.getValidAccessToken(userId);
    const rejected = expect(pending).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await started.promise;
    await accounts.saveOAuth(
      userId,
      reconnectProfile,
      { ...tokens, accessToken: 'newer-oauth' },
      version.generation,
      new Date(),
    );
    await db
      .update(githubOauthGrants)
      .set({ updatedAt: previous!.updatedAt })
      .where(eq(githubOauthGrants.accountLinkId, link.id));
    gate.resolve({ ...tokens, accessToken: 'stale-refreshed' });
    await rejected;
    await expect(accounts.getValidAccessToken(userId)).resolves.toBe(
      'newer-oauth',
    );
  });

  it('preserves reconnected OAuth and App grants when stale refresh fails at an identical timestamp', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    const linked = await accounts.findByUserId(userId);
    const reconnectProfile = {
      githubUserId: linked!.githubUserId,
      login: linked!.login,
      avatarUrl: linked!.avatarUrl,
    };
    const link = await accounts.saveOAuth(
      userId,
      reconnectProfile,
      {
        ...tokens,
        accessToken: 'reused-oauth',
        tokenExpiresAt: new Date(Date.now() - 1_000),
      },
      version.generation,
      new Date(),
    );
    const [previous] = await db
      .select({ updatedAt: githubOauthGrants.updatedAt })
      .from(githubOauthGrants)
      .where(eq(githubOauthGrants.accountLinkId, link.id));
    const oauthGate = deferred<typeof tokens>();
    const oauthStarted = deferred<void>();
    vi.spyOn(
      app.get(GithubAccountOauthClientService),
      'refresh',
    ).mockImplementation(() => {
      oauthStarted.resolve();
      return oauthGate.promise;
    });
    const oauthPending = accounts.getValidAccessToken(userId);
    const oauthRejected = expect(oauthPending).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await oauthStarted.promise;
    await accounts.saveOAuth(
      userId,
      reconnectProfile,
      { ...tokens, accessToken: 'reused-oauth', refreshToken: 'new-refresh' },
      version.generation,
      new Date(),
    );
    await db
      .update(githubOauthGrants)
      .set({ updatedAt: previous!.updatedAt })
      .where(eq(githubOauthGrants.accountLinkId, link.id));
    oauthGate.reject(new UnauthorizedException());
    await oauthRejected;
    await expect(accounts.getValidAccessToken(userId)).resolves.toBe(
      'reused-oauth',
    );

    const appTokens = {
      accessToken: 'old-app',
      refreshToken: 'old-refresh',
      tokenExpiresAt: new Date(Date.now() - 1_000),
      refreshTokenExpiresAt: new Date(Date.now() + 120_000),
    };
    const previousApp = await connections.upsertConnected(
      userId,
      reconnectProfile,
      appTokens,
      { generation: version.generation, startedAt: new Date() },
    );
    const appGate = deferred<typeof appTokens>();
    const appStarted = deferred<void>();
    vi.spyOn(app.get(GithubOauthClientService), 'refresh').mockImplementation(
      () => {
        appStarted.resolve();
        return appGate.promise;
      },
    );
    const appPending = connections.getValidAccessToken(userId);
    const appRejected = expect(appPending).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await appStarted.promise;
    await connections.upsertConnected(
      userId,
      reconnectProfile,
      {
        ...appTokens,
        accessToken: 'new-app',
        tokenExpiresAt: new Date(Date.now() + 120_000),
      },
      { generation: version.generation, startedAt: new Date() },
    );
    await db
      .update(githubConnections)
      .set({ updatedAt: previousApp.updatedAt })
      .where(eq(githubConnections.id, previousApp.id));
    appGate.reject(new ServiceUnavailableException());
    await appRejected;
    await expect(connections.getValidAccessToken(userId)).resolves.toBe(
      'new-app',
    );
  });

  it('enforces refreshed OAuth scopes while preserving working App access', async () => {
    const userId = userIds[1]!;
    const version = await accounts.getVersion(userId);
    const linked = await accounts.findByUserId(userId);
    await accounts.saveOAuth(
      userId,
      {
        githubUserId: linked!.githubUserId,
        login: linked!.login,
        avatarUrl: linked!.avatarUrl,
      },
      { ...tokens, tokenExpiresAt: new Date(Date.now() - 1_000) },
      version.generation,
      new Date(),
    );
    vi.spyOn(
      app.get(GithubAccountOauthClientService),
      'refresh',
    ).mockResolvedValue({
      ...tokens,
      accessToken: 'partial-refreshed',
      scopes: ['user:email'],
    });
    await expect(accounts.getValidAccessToken(userId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(accounts.status(userId)).resolves.toMatchObject({
      status: 'connected',
      oauth: {
        status: 'authorized',
        missingScopes: ['read:org', 'read:project'],
      },
      capabilities: {
        organizationDiscovery: 'permission_required',
        personalData: 'ready',
      },
    });
    await expect(connections.getValidAccessToken(userId)).resolves.toBe(
      'new-app',
    );
  });
});
