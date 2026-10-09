import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  GitHubConnectionStatusResponse,
  GitHubConnectionAccount,
} from '@gitiempo/shared';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  githubConnectionRowSelection,
  githubConnections,
  type GithubConnectionRow,
} from '../schemas/github-connections.schema';
import { githubAccountLinks } from '../schemas/github-account-links.schema';
import { githubAuthorizationGenerations } from '../schemas/github-authorization-generations.schema';
import { GithubAccountIdentityMismatchError } from './github-account.service';
import {
  GithubOauthClientService,
  type GithubTokenSet,
  type GithubUserProfile,
} from './github-oauth-client.service';
import { GithubEncryptionService } from './github-encryption.service';

const REFRESH_SKEW_MS = 60 * 1_000;

@Injectable()
export class GithubConnectionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly encryption: GithubEncryptionService,
    private readonly oauthClient: GithubOauthClientService,
  ) {}

  async status(userId: string): Promise<GitHubConnectionStatusResponse> {
    const row = await this.findByUserId(userId);
    if (!row || !this.isUsableConnection(row)) {
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
    return {
      status: 'connected',
      account: this.toAccount(row),
      oauth: { status: 'not_authorized', missingScopes: [] },
      capabilities: {
        organizationDiscovery: 'authorization_required',
        personalData: 'ready',
      },
      disconnect: 'verification_unavailable',
    };
  }

  async upsertConnected(
    userId: string,
    profile: GithubUserProfile,
    tokens: GithubTokenSet,
    snapshot: { generation: number; startedAt: Date },
  ): Promise<GithubConnectionRow> {
    return this.db.transaction(async (tx) => {
      const version = await this.lockVersionFor(tx, userId);
      if (
        !version ||
        version.generation !== snapshot.generation ||
        (version.disconnectedAt !== null &&
          version.disconnectedAt >= snapshot.startedAt)
      ) {
        throw new NotFoundException(
          'GitHub authorization is no longer current',
        );
      }
      const [link] = await tx
        .select({ githubUserId: githubAccountLinks.githubUserId })
        .from(githubAccountLinks)
        .where(eq(githubAccountLinks.userId, userId))
        .limit(1);
      if (!link || link.githubUserId !== profile.githubUserId) {
        throw new GithubAccountIdentityMismatchError();
      }
      return this.upsertConnectedWith(tx, userId, profile, tokens);
    });
  }

  private async upsertConnectedWith(
    db: Pick<DrizzleDB, 'insert'>,
    userId: string,
    profile: GithubUserProfile,
    tokens: GithubTokenSet,
  ): Promise<GithubConnectionRow> {
    const now = new Date();
    const row = (
      await db
        .insert(githubConnections)
        .values({
          userId,
          githubUserId: profile.githubUserId,
          login: profile.login,
          avatarUrl: profile.avatarUrl,
          accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
          refreshTokenEncrypted: this.encryption.encrypt(tokens.refreshToken),
          tokenExpiresAt: tokens.tokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          connected: true,
          connectedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: githubConnections.userId,
          set: {
            githubUserId: profile.githubUserId,
            login: profile.login,
            avatarUrl: profile.avatarUrl,
            accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
            refreshTokenEncrypted: this.encryption.encrypt(tokens.refreshToken),
            tokenExpiresAt: tokens.tokenExpiresAt,
            refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
            connected: true,
            updatedAt: now,
          },
        })
        .returning()
    )[0]!;
    return row;
  }

  async disconnect(userId: string): Promise<void> {
    const row = await this.findByUserId(userId);
    if (!row) return;
    await this.markDisconnected(row.id);
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const row = await this.findUsableByUserId(userId);
    if (!row) throw new NotFoundException('GitHub connection not found');
    if (this.isAccessTokenValid(row)) {
      return this.encryption.decrypt(row.accessTokenEncrypted!);
    }
    const version = await this.getVersion(userId);
    return this.refreshAccessToken(row, version.generation);
  }

  private async refreshAccessToken(
    row: GithubConnectionRow,
    generation: number,
  ): Promise<string> {
    try {
      const refreshToken = this.encryption.decrypt(row.refreshTokenEncrypted!);
      const tokens = await this.oauthClient.refresh(refreshToken);
      const updated = await this.updateTokensIfCurrent(row, tokens, generation);
      if (updated)
        return this.encryption.decrypt(updated.accessTokenEncrypted!);

      const reread = await this.findUsableByUserId(row.userId);
      if (reread && this.isAccessTokenValid(reread)) {
        return this.encryption.decrypt(reread.accessTokenEncrypted!);
      }
    } catch (err) {
      const reread = await this.findUsableByUserId(row.userId);
      if (reread && reread.updatedAt.getTime() !== row.updatedAt.getTime()) {
        if (this.isAccessTokenValid(reread)) {
          return this.encryption.decrypt(reread.accessTokenEncrypted!);
        }
      }
      await this.markDisconnectedIfCurrent(row, generation);
      throw err;
    }
    throw new ServiceUnavailableException('GitHub token refresh failed');
  }

  private async updateTokensIfCurrent(
    row: GithubConnectionRow,
    tokens: GithubTokenSet,
    generation: number,
  ): Promise<GithubConnectionRow | null> {
    return this.db.transaction(async (tx) => {
      const version = await this.lockVersionFor(tx, row.userId);
      if (version.generation !== generation) return null;
      const [link] = await tx
        .select({ githubUserId: githubAccountLinks.githubUserId })
        .from(githubAccountLinks)
        .where(eq(githubAccountLinks.userId, row.userId))
        .limit(1);
      if (!link || link.githubUserId !== row.githubUserId) return null;
      const [updated] = await tx
        .update(githubConnections)
        .set({
          accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
          refreshTokenEncrypted: this.encryption.encrypt(tokens.refreshToken),
          tokenExpiresAt: tokens.tokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(githubConnections.id, row.id),
            eq(githubConnections.updatedAt, row.updatedAt),
            eq(githubConnections.connected, true),
            eq(
              githubConnections.accessTokenEncrypted,
              row.accessTokenEncrypted!,
            ),
          ),
        )
        .returning();
      return updated ?? null;
    });
  }

  private async getVersion(userId: string): Promise<{ generation: number }> {
    await this.db
      .insert(githubAuthorizationGenerations)
      .values({ userId })
      .onConflictDoNothing({ target: githubAuthorizationGenerations.userId });
    const [row] = await this.db
      .select({ generation: githubAuthorizationGenerations.generation })
      .from(githubAuthorizationGenerations)
      .where(eq(githubAuthorizationGenerations.userId, userId))
      .limit(1);
    return { generation: row?.generation ?? 0 };
  }

  private async lockVersionFor(
    tx: Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
    userId: string,
  ): Promise<{ generation: number; disconnectedAt: Date | null }> {
    await tx
      .insert(githubAuthorizationGenerations)
      .values({ userId })
      .onConflictDoNothing({ target: githubAuthorizationGenerations.userId });
    const result = await tx.execute(
      sql`SELECT generation, disconnected_at FROM github_authorization_generations WHERE user_id = ${userId}::uuid FOR UPDATE`,
    );
    const row = result.rows[0] as
      | { generation: number; disconnected_at: Date | null }
      | undefined;
    return {
      generation: row?.generation ?? 0,
      disconnectedAt: row?.disconnected_at ?? null,
    };
  }

  private async markDisconnected(id: string): Promise<void> {
    await this.db
      .update(githubConnections)
      .set({
        connected: false,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(githubConnections.id, id));
  }

  private async markDisconnectedIfCurrent(
    row: GithubConnectionRow,
    generation: number,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const version = await this.lockVersionFor(tx, row.userId);
      if (version.generation !== generation) return;
      await tx
        .update(githubConnections)
        .set({
          connected: false,
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(githubConnections.id, row.id),
            eq(githubConnections.updatedAt, row.updatedAt),
            eq(
              githubConnections.accessTokenEncrypted,
              row.accessTokenEncrypted!,
            ),
          ),
        );
    });
  }

  private async findByUserId(
    userId: string,
  ): Promise<GithubConnectionRow | null> {
    const [row] = await this.db
      .select(githubConnectionRowSelection)
      .from(githubConnections)
      .innerJoin(
        githubAccountLinks,
        and(
          eq(githubAccountLinks.userId, githubConnections.userId),
          eq(githubAccountLinks.githubUserId, githubConnections.githubUserId),
        ),
      )
      .where(eq(githubConnections.userId, userId))
      .limit(1);
    return row ?? null;
  }

  private async findUsableByUserId(
    userId: string,
  ): Promise<GithubConnectionRow | null> {
    const [row] = await this.db
      .select(githubConnectionRowSelection)
      .from(githubConnections)
      .innerJoin(
        githubAccountLinks,
        and(
          eq(githubAccountLinks.userId, githubConnections.userId),
          eq(githubAccountLinks.githubUserId, githubConnections.githubUserId),
        ),
      )
      .where(
        and(
          eq(githubConnections.userId, userId),
          eq(githubConnections.connected, true),
          isNotNull(githubConnections.accessTokenEncrypted),
          isNotNull(githubConnections.refreshTokenEncrypted),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private isUsableConnection(row: GithubConnectionRow): boolean {
    return (
      row.connected &&
      row.accessTokenEncrypted !== null &&
      row.refreshTokenEncrypted !== null
    );
  }

  private isAccessTokenValid(row: GithubConnectionRow): boolean {
    return (
      row.tokenExpiresAt !== null &&
      row.tokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS
    );
  }

  private toAccount(row: GithubConnectionRow): GitHubConnectionAccount {
    return {
      githubUserId: row.githubUserId,
      login: row.login,
      avatarUrl: row.avatarUrl,
      connectedAt: row.connectedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
