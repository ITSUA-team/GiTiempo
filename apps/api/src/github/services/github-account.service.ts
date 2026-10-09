import { createHash } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  GitHubConnectionAccount,
  GitHubConnectionStatusResponse,
  GitHubDisconnectResponse,
} from '@gitiempo/shared';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { workspaceMembers } from '../../members/schemas/workspace-members.schema';
import { users } from '../../users/schemas/users.schema';
import {
  FIREBASE_ADMIN,
  type FirebaseAdminService,
} from '../../auth/services/firebase-admin.interface';
import { TokenService } from '../../auth/services/token.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { githubConnections } from '../schemas/github-connections.schema';
import {
  githubAccountLinkRowSelection,
  githubAccountLinks,
  type GithubAccountLinkRow,
} from '../schemas/github-account-links.schema';
import {
  githubAuthorizationGenerations,
  githubAuthorizationGenerationRowSelection,
} from '../schemas/github-authorization-generations.schema';
import {
  githubOauthGrantRowSelection,
  githubOauthGrants,
  type GithubOauthGrantRow,
} from '../schemas/github-oauth-grants.schema';
import { GithubEncryptionService } from './github-encryption.service';
import {
  GithubAccountOauthClientService,
  type GithubOAuthTokenSet,
} from './github-account-oauth-client.service';
import type { GithubUserProfile } from './github-oauth-client.service';
import { GithubOauthClientService } from './github-oauth-client.service';
import { GithubOauthStateService } from './github-oauth-state.service';

const REFRESH_SKEW_MS = 60_000;
const REQUIRED_OAUTH_SCOPES = [
  'user:email',
  'read:org',
  'read:project',
] as const;

export type GithubAccountTransaction = Parameters<
  Parameters<DrizzleDB['transaction']>[0]
>[0];

export class GithubAccountLinkConflictError extends ConflictException {
  constructor() {
    super({
      code: 'github_account_conflict',
      message: 'GitHub account is already linked',
    });
  }
}

export class GithubAccountIdentityMismatchError extends ConflictException {
  constructor() {
    super({
      code: 'github_identity_mismatch',
      message: 'GitHub account does not match the linked account',
    });
  }
}

export interface GithubAuthorizationVersion {
  generation: number;
  disconnectedAt: Date | null;
}

@Injectable()
export class GithubAccountService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(GithubEncryptionService)
    private readonly encryption: GithubEncryptionService,
    @Inject(GithubAccountOauthClientService)
    private readonly oauthClient: GithubAccountOauthClientService,
    @Inject(GithubOauthClientService)
    private readonly appOauthClient: GithubOauthClientService,
    @Inject(GithubOauthStateService)
    private readonly states: GithubOauthStateService,
    @Inject(TokenService)
    private readonly tokens: TokenService,
    @Inject(ConfigService)
    private readonly config: ConfigService<Env, true>,
    @Inject(FIREBASE_ADMIN) private readonly firebase: FirebaseAdminService,
  ) {}

  async findByGithubId(
    githubUserId: string,
  ): Promise<GithubAccountLinkRow | null> {
    const [row] = await this.db
      .select(githubAccountLinkRowSelection)
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.githubUserId, githubUserId))
      .limit(1);
    return row ?? null;
  }

  async findByUserId(userId: string): Promise<GithubAccountLinkRow | null> {
    const [row] = await this.db
      .select(githubAccountLinkRowSelection)
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async getVersion(userId: string): Promise<GithubAuthorizationVersion> {
    return this.getVersionFor(this.db, userId);
  }

  /** Invalidates existing state snapshots without changing the active link. */
  async invalidatePendingAuthorizations(userId: string): Promise<void> {
    await this.db
      .insert(githubAuthorizationGenerations)
      .values({
        userId,
        generation: 1,
        disconnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: githubAuthorizationGenerations.userId,
        set: {
          generation: sql`${githubAuthorizationGenerations.generation} + 1`,
          disconnectedAt: sql`GREATEST(COALESCE(${githubAuthorizationGenerations.disconnectedAt}, '-infinity'::timestamptz), now())`,
          updatedAt: new Date(),
        },
      });
  }

  async assertLoginCurrent(
    userId: string,
    startedAt: Date,
    generation: number,
  ): Promise<void> {
    const current = await this.getVersion(userId);
    if (
      current.generation !== generation ||
      (current.disconnectedAt !== null && current.disconnectedAt >= startedAt)
    ) {
      throw new UnauthorizedException(
        'GitHub authorization is no longer current',
      );
    }
  }

  async createAuthorization(
    userId: string,
    sessionToken: string,
  ): Promise<{ authorizationUrl: string }> {
    await this.assertSession(userId, sessionToken);
    const version = await this.getVersion(userId);
    const state = await this.states.create({
      userId,
      provider: 'oauth_app',
      purpose: 'account_link',
      sessionTokenHash: hashSessionToken(sessionToken),
      generation: version.generation,
    });
    return { authorizationUrl: this.oauthClient.buildAuthorizationUrl(state) };
  }

  async completeCallback(input: {
    code?: string;
    state?: string;
    error?: string;
    sessionToken?: string;
  }): Promise<string> {
    if (input.error) return this.profileRedirect('github_denied');
    if (!input.code || !input.state || !input.sessionToken) {
      return this.profileRedirect('invalid_callback');
    }
    const state = await this.states.claim(input.state);
    if (
      !state ||
      state.provider !== 'oauth_app' ||
      state.purpose !== 'account_link' ||
      !state.sessionTokenHash ||
      state.sessionTokenHash !== hashSessionToken(input.sessionToken)
    ) {
      return this.profileRedirect('invalid_state');
    }
    const startedAt = state.createdAt;
    try {
      await this.assertSession(state.userId, input.sessionToken);
      await this.assertLoginCurrent(state.userId, startedAt, state.generation);
      const tokens = await this.oauthClient.exchangeCode(
        input.code,
        state.codeVerifier,
      );
      const profile = await this.oauthClient.getCurrentUser(tokens.accessToken);
      await this.assertSession(state.userId, input.sessionToken);
      await this.saveOAuth(
        state.userId,
        profile,
        tokens,
        state.generation,
        startedAt,
      );
      return this.profileRedirect(null);
    } catch (error) {
      if (error instanceof GithubAccountLinkConflictError) {
        return this.profileRedirect('github_account_conflict');
      }
      if (error instanceof GithubAccountIdentityMismatchError) {
        return this.profileRedirect('github_identity_mismatch');
      }
      if (error instanceof UnauthorizedException)
        return this.profileRedirect('invalid_state');
      return this.profileRedirect('github_exchange_failed');
    }
  }

  async saveOAuth(
    userId: string,
    profile: GithubUserProfile,
    tokens: GithubOAuthTokenSet,
    expectedGeneration: number,
    startedAt: Date,
  ): Promise<GithubAccountLinkRow> {
    return this.saveOAuthAndRun(
      userId,
      profile,
      tokens,
      expectedGeneration,
      startedAt,
      async (_tx, link) => link,
    );
  }

  async saveOAuthAndRun<T>(
    userId: string,
    profile: GithubUserProfile,
    tokens: GithubOAuthTokenSet,
    expectedGeneration: number,
    startedAt: Date,
    run: (
      tx: GithubAccountTransaction,
      link: GithubAccountLinkRow,
    ) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      const version = await this.lockVersionFor(tx, userId);
      if (
        version.generation !== expectedGeneration ||
        (version.disconnectedAt !== null && version.disconnectedAt >= startedAt)
      ) {
        throw new UnauthorizedException(
          'GitHub authorization is no longer current',
        );
      }

      // A callback can outlive the authenticated browser session.  Re-check a
      // live workspace membership while holding the same durable operation
      // lock so an account link cannot be committed for a removed member.
      await this.assertHasMembership(tx, userId);

      const link = await this.claimLink(tx, userId, profile);
      const now = new Date();
      await tx
        .insert(githubOauthGrants)
        .values({
          accountLinkId: link.id,
          accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
          refreshTokenEncrypted: tokens.refreshToken
            ? this.encryption.encrypt(tokens.refreshToken)
            : null,
          scopes: normalizeGrantedScopes(tokens.scopes),
          tokenExpiresAt: tokens.tokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          authorizedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: githubOauthGrants.accountLinkId,
          set: {
            accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
            refreshTokenEncrypted: tokens.refreshToken
              ? this.encryption.encrypt(tokens.refreshToken)
              : null,
            scopes: normalizeGrantedScopes(tokens.scopes),
            tokenExpiresAt: tokens.tokenExpiresAt,
            refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
            authorizedAt: now,
            updatedAt: now,
          },
        });
      return run(tx, link);
    });
  }

  async status(userId: string): Promise<GitHubConnectionStatusResponse> {
    const [link] = await this.db
      .select(githubAccountLinkRowSelection)
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.userId, userId))
      .limit(1);
    if (!link) return disconnectedStatus();

    const [grant] = await this.db
      .select(githubOauthGrantRowSelection)
      .from(githubOauthGrants)
      .where(eq(githubOauthGrants.accountLinkId, link.id))
      .limit(1);
    const [app] = await this.db
      .select({
        connected: githubConnections.connected,
        githubUserId: githubConnections.githubUserId,
        access: githubConnections.accessTokenEncrypted,
        refresh: githubConnections.refreshTokenEncrypted,
        tokenExpiresAt: githubConnections.tokenExpiresAt,
        refreshTokenExpiresAt: githubConnections.refreshTokenExpiresAt,
      })
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);
    const missingScopes = grant ? missingOauthScopes(grant.scopes) : [];
    const oauthStatus = !grant
      ? 'not_authorized'
      : isOAuthGrantUsable(grant)
        ? 'authorized'
        : 'reauthorization_required';
    const hasAppAccess = Boolean(
      app?.connected &&
      app.githubUserId === link.githubUserId &&
      app.access &&
      ((app.tokenExpiresAt !== null &&
        app.tokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS) ||
        (app.refresh !== null &&
          (app.refreshTokenExpiresAt === null ||
            app.refreshTokenExpiresAt.getTime() > Date.now()))),
    );
    const disconnect = await this.disconnectEligibility(userId);

    return {
      status: 'connected',
      account: this.toAccount(link),
      oauth: { status: oauthStatus, missingScopes },
      capabilities: {
        organizationDiscovery:
          oauthStatus === 'not_authorized'
            ? 'authorization_required'
            : missingScopes.includes('read:org')
              ? 'permission_required'
              : oauthStatus === 'reauthorization_required'
                ? 'authorization_required'
                : 'ready',
        personalData: hasAppAccess ? 'ready' : 'authorization_required',
      },
      disconnect,
    };
  }

  async getValidAccessToken(
    userId: string,
    requiredScope = 'read:org',
  ): Promise<string> {
    const [row] = await this.db
      .select({ link: githubAccountLinks, grant: githubOauthGrants })
      .from(githubAccountLinks)
      .innerJoin(
        githubOauthGrants,
        eq(githubOauthGrants.accountLinkId, githubAccountLinks.id),
      )
      .where(eq(githubAccountLinks.userId, userId))
      .limit(1);
    if (!row)
      throw new NotFoundException('GitHub OAuth authorization not found');
    if (!scopeGrants(row.grant.scopes, requiredScope)) {
      throw new ForbiddenException({
        code: 'github_oauth_permission_required',
        message: 'GitHub permission is required',
      });
    }
    if (isOAuthAccessTokenValid(row.grant))
      return this.encryption.decrypt(row.grant.accessTokenEncrypted);
    if (
      !row.grant.refreshTokenEncrypted ||
      (row.grant.refreshTokenExpiresAt !== null &&
        row.grant.refreshTokenExpiresAt.getTime() <= Date.now())
    ) {
      throw new UnauthorizedException(
        'GitHub OAuth authorization requires reconnection',
      );
    }
    const version = await this.getVersion(userId);
    const refreshToken = this.encryption.decrypt(
      row.grant.refreshTokenEncrypted,
    );
    let refreshed: GithubOAuthTokenSet;
    try {
      refreshed = await this.oauthClient.refresh(refreshToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.db.transaction(async (tx) => {
          const current = await this.lockVersionFor(tx, userId);
          if (current.generation !== version.generation) return;
          await tx
            .delete(githubOauthGrants)
            .where(
              and(
                eq(githubOauthGrants.id, row.grant.id),
                eq(
                  githubOauthGrants.accessTokenEncrypted,
                  row.grant.accessTokenEncrypted,
                ),
                eq(
                  githubOauthGrants.refreshTokenEncrypted,
                  row.grant.refreshTokenEncrypted!,
                ),
              ),
            );
        });
      }
      throw error;
    }
    const updated = await this.refreshIfCurrent(
      row.link,
      row.grant,
      refreshed,
      version.generation,
    );
    if (!updated)
      throw new UnauthorizedException(
        'GitHub authorization is no longer current',
      );
    if (!scopeGrants(updated.scopes, requiredScope)) {
      throw new ForbiddenException({
        code: 'github_oauth_permission_required',
        message: 'GitHub permission is required',
      });
    }
    return this.encryption.decrypt(updated.accessTokenEncrypted);
  }

  /** Removes only the OAuth grant when GitHub rejects the exact token used. */
  async invalidateOAuthAccess(
    userId: string,
    failedAccessToken: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.lockVersionFor(tx, userId);
      const [row] = await tx
        .select({ grant: githubOauthGrants })
        .from(githubAccountLinks)
        .innerJoin(
          githubOauthGrants,
          eq(githubOauthGrants.accountLinkId, githubAccountLinks.id),
        )
        .where(eq(githubAccountLinks.userId, userId))
        .limit(1);
      if (!row) return;
      try {
        if (
          this.encryption.decrypt(row.grant.accessTokenEncrypted) !==
          failedAccessToken
        )
          return;
      } catch {
        return;
      }
      await tx
        .delete(githubOauthGrants)
        .where(eq(githubOauthGrants.id, row.grant.id));
    });
  }

  async disconnect(userId: string): Promise<GitHubDisconnectResponse> {
    const credentials = await this.db.transaction(async (tx) => {
      await this.lockVersionFor(tx, userId);
      const [link] = await tx
        .select(githubAccountLinkRowSelection)
        .from(githubAccountLinks)
        .where(eq(githubAccountLinks.userId, userId))
        .limit(1);
      const [app] = await tx
        .select({
          accessTokenEncrypted: githubConnections.accessTokenEncrypted,
        })
        .from(githubConnections)
        .where(eq(githubConnections.userId, userId))
        .limit(1);
      if (!link && !app?.accessTokenEncrypted) {
        await this.advanceGenerationFor(tx, userId);
        await tx
          .delete(githubConnections)
          .where(eq(githubConnections.userId, userId));
        return null;
      }
      let alternative: boolean;
      try {
        alternative = await this.hasUsableAlternativeLogin(userId);
      } catch {
        throw new ServiceUnavailableException({
          code: 'github_disconnect_verification_unavailable',
          message: 'Unable to verify another sign-in method',
        });
      }
      if (!alternative) {
        throw new ForbiddenException({
          code: 'github_alternative_signin_required',
          message: 'Set up another sign-in method before disconnecting GitHub',
        });
      }
      const [grant] = link
        ? await tx
            .select(githubOauthGrantRowSelection)
            .from(githubOauthGrants)
            .where(eq(githubOauthGrants.accountLinkId, link.id))
            .limit(1)
        : [];
      await this.advanceGenerationFor(tx, userId);
      await tx
        .delete(githubConnections)
        .where(eq(githubConnections.userId, userId));
      if (link)
        await tx
          .delete(githubAccountLinks)
          .where(eq(githubAccountLinks.id, link.id));
      return {
        oauthAccessTokenEncrypted: grant?.accessTokenEncrypted ?? null,
        appAccessTokenEncrypted: app?.accessTokenEncrypted ?? null,
      };
    });
    if (!credentials)
      return { disconnected: true, providerRevocation: 'not_required' };
    let confirmed = true;
    for (const [encrypted, revoke] of [
      [
        credentials.oauthAccessTokenEncrypted,
        this.oauthClient.revoke.bind(this.oauthClient),
      ],
      [
        credentials.appAccessTokenEncrypted,
        this.appOauthClient.revoke.bind(this.appOauthClient),
      ],
    ] as const) {
      if (!encrypted) continue;
      try {
        confirmed =
          (await revoke(this.encryption.decrypt(encrypted))) && confirmed;
      } catch {
        confirmed = false;
      }
    }
    return {
      disconnected: true,
      providerRevocation: confirmed ? 'confirmed' : 'unconfirmed',
    };
  }

  private async claimLink(
    tx: GithubAccountTransaction,
    userId: string,
    profile: GithubUserProfile,
  ): Promise<GithubAccountLinkRow> {
    const [forUser] = await tx
      .select(githubAccountLinkRowSelection)
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.userId, userId))
      .limit(1);
    if (forUser && forUser.githubUserId !== profile.githubUserId) {
      throw new GithubAccountIdentityMismatchError();
    }
    const [forGithub] = await tx
      .select(githubAccountLinkRowSelection)
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.githubUserId, profile.githubUserId))
      .limit(1);
    if (forGithub && forGithub.userId !== userId)
      throw new GithubAccountLinkConflictError();
    const now = new Date();
    if (forUser) {
      const [updated] = await tx
        .update(githubAccountLinks)
        .set({
          login: profile.login,
          avatarUrl: profile.avatarUrl,
          updatedAt: now,
        })
        .where(eq(githubAccountLinks.id, forUser.id))
        .returning();
      return updated!;
    }
    const [created] = await tx
      .insert(githubAccountLinks)
      .values({
        userId,
        githubUserId: profile.githubUserId,
        login: profile.login,
        avatarUrl: profile.avatarUrl,
        connectedAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    // A concurrent unique claim finishes before ON CONFLICT returns. Re-read in
    // the still-valid transaction and return a safe ownership result.
    const [existing] = await tx
      .select(githubAccountLinkRowSelection)
      .from(githubAccountLinks)
      .where(eq(githubAccountLinks.githubUserId, profile.githubUserId))
      .limit(1);
    if (existing?.userId === userId) return existing;
    if (existing) throw new GithubAccountLinkConflictError();
    throw new ServiceUnavailableException(
      'GitHub identity could not be stored',
    );
  }

  private async refreshIfCurrent(
    link: GithubAccountLinkRow,
    grant: GithubOauthGrantRow,
    tokens: GithubOAuthTokenSet,
    generation: number,
  ): Promise<GithubOauthGrantRow | null> {
    return this.db.transaction(async (tx) => {
      const version = await this.lockVersionFor(tx, link.userId);
      if (version.generation !== generation) return null;
      const [updated] = await tx
        .update(githubOauthGrants)
        .set({
          accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
          refreshTokenEncrypted: tokens.refreshToken
            ? this.encryption.encrypt(tokens.refreshToken)
            : null,
          scopes: normalizeGrantedScopes(tokens.scopes),
          tokenExpiresAt: tokens.tokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(githubOauthGrants.id, grant.id),
            eq(githubOauthGrants.updatedAt, grant.updatedAt),
            eq(
              githubOauthGrants.accessTokenEncrypted,
              grant.accessTokenEncrypted,
            ),
          ),
        )
        .returning();
      return updated ?? null;
    });
  }

  private async assertSession(
    userId: string,
    sessionToken: string,
  ): Promise<void> {
    const claims = this.tokens.verifyAccess(sessionToken);
    if (claims.sub !== userId) throw new UnauthorizedException('Unauthorized');
    const [membership] = await this.db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, claims.workspaceId),
        ),
      )
      .limit(1);
    if (!membership) throw new UnauthorizedException('Unauthorized');
  }

  private async assertHasMembership(
    db: GithubAccountTransaction,
    userId: string,
  ): Promise<void> {
    const [membership] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);
    if (!membership) throw new UnauthorizedException('Unauthorized');
  }

  private async getVersionFor(
    db: DrizzleDB | GithubAccountTransaction,
    userId: string,
  ): Promise<GithubAuthorizationVersion> {
    await db
      .insert(githubAuthorizationGenerations)
      .values({ userId })
      .onConflictDoNothing({ target: githubAuthorizationGenerations.userId });
    const [row] = await db
      .select(githubAuthorizationGenerationRowSelection)
      .from(githubAuthorizationGenerations)
      .where(eq(githubAuthorizationGenerations.userId, userId))
      .limit(1);
    return {
      generation: row?.generation ?? 0,
      disconnectedAt: row?.disconnectedAt ?? null,
    };
  }

  private async lockVersionFor(
    tx: GithubAccountTransaction,
    userId: string,
  ): Promise<GithubAuthorizationVersion> {
    await tx
      .insert(githubAuthorizationGenerations)
      .values({ userId })
      .onConflictDoNothing({ target: githubAuthorizationGenerations.userId });
    const result = await tx.execute(sql`
      SELECT generation, disconnected_at
      FROM github_authorization_generations
      WHERE user_id = ${userId}::uuid
      FOR UPDATE
    `);
    const row = result.rows[0] as
      | { generation: number; disconnected_at: Date | null }
      | undefined;
    return {
      generation: row?.generation ?? 0,
      disconnectedAt: row?.disconnected_at ?? null,
    };
  }

  private async advanceGenerationFor(
    tx: GithubAccountTransaction,
    userId: string,
  ): Promise<void> {
    await tx
      .update(githubAuthorizationGenerations)
      .set({
        generation: sql`${githubAuthorizationGenerations.generation} + 1`,
        disconnectedAt: sql`GREATEST(COALESCE(${githubAuthorizationGenerations.disconnectedAt}, '-infinity'::timestamptz), now())`,
        updatedAt: new Date(),
      })
      .where(eq(githubAuthorizationGenerations.userId, userId));
  }

  private async disconnectEligibility(
    userId: string,
  ): Promise<
    'allowed' | 'alternative_signin_required' | 'verification_unavailable'
  > {
    try {
      return (await this.hasUsableAlternativeLogin(userId))
        ? 'allowed'
        : 'alternative_signin_required';
    } catch {
      return 'verification_unavailable';
    }
  }

  private toAccount(link: GithubAccountLinkRow): GitHubConnectionAccount {
    return {
      githubUserId: link.githubUserId,
      login: link.login,
      avatarUrl: link.avatarUrl,
      connectedAt: link.connectedAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    };
  }

  private async hasUsableAlternativeLogin(userId: string): Promise<boolean> {
    const [user] = await this.db
      .select({ firebaseUid: users.firebaseUid })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user)
      throw new ServiceUnavailableException(
        'Unable to verify another sign-in method',
      );
    return this.firebase.hasUsableAlternativeLogin(user.firebaseUid);
  }

  private profileRedirect(code: string | null): string {
    const url = new URL(
      '/profile',
      this.config.get('USER_SPA_URL', { infer: true }),
    );
    url.searchParams.set('github', code ? 'error' : 'connected');
    if (code) url.searchParams.set('code', code);
    return url.toString();
  }
}

function hashSessionToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function normalizeGrantedScopes(scopes: readonly string[]): string[] {
  return [
    ...new Set(scopes.map((scope) => scope.trim()).filter(Boolean)),
  ].sort();
}
export function scopeGrants(
  scopes: readonly string[],
  required: string,
): boolean {
  if (scopes.includes(required)) return true;
  if (required === 'user:email') return scopes.includes('user');
  if (required === 'read:org') {
    return scopes.includes('admin:org') || scopes.includes('write:org');
  }
  if (required === 'read:project') return scopes.includes('project');
  return false;
}
function missingOauthScopes(
  scopes: readonly string[],
): Array<(typeof REQUIRED_OAUTH_SCOPES)[number]> {
  return REQUIRED_OAUTH_SCOPES.filter((scope) => !scopeGrants(scopes, scope));
}
function isOAuthGrantUsable(grant: GithubOauthGrantRow): boolean {
  return (
    grant.tokenExpiresAt === null ||
    grant.tokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS ||
    (grant.refreshTokenEncrypted !== null &&
      (grant.refreshTokenExpiresAt === null ||
        grant.refreshTokenExpiresAt.getTime() > Date.now()))
  );
}
function isOAuthAccessTokenValid(grant: GithubOauthGrantRow): boolean {
  return (
    grant.tokenExpiresAt === null ||
    grant.tokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS
  );
}
function disconnectedStatus(): GitHubConnectionStatusResponse {
  return {
    status: 'disconnected',
    account: null,
    oauth: { status: 'not_authorized', missingScopes: [] },
    capabilities: {
      organizationDiscovery: 'authorization_required',
      personalData: 'authorization_required',
    },
    disconnect: 'allowed',
  };
}
