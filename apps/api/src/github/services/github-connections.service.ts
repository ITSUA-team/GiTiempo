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
import { and, eq, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  githubConnections,
  type GithubConnectionRow,
} from '../schemas/github-connections.schema';
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
      return { status: 'disconnected', account: null };
    }
    return { status: 'connected', account: this.toAccount(row) };
  }

  async upsertConnected(
    userId: string,
    profile: GithubUserProfile,
    tokens: GithubTokenSet,
  ): Promise<GithubConnectionRow> {
    const now = new Date();
    const [row] = await this.db
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
      .returning();
    if (!row) throw new Error('Failed to upsert GitHub connection');
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
    return this.refreshAccessToken(row);
  }

  private async refreshAccessToken(row: GithubConnectionRow): Promise<string> {
    try {
      const refreshToken = this.encryption.decrypt(row.refreshTokenEncrypted!);
      const tokens = await this.oauthClient.refresh(refreshToken);
      const updated = await this.updateTokensIfUnchanged(row, tokens);
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
      await this.markDisconnected(row.id);
      throw err;
    }
    throw new ServiceUnavailableException('GitHub token refresh failed');
  }

  private async updateTokensIfUnchanged(
    row: GithubConnectionRow,
    tokens: GithubTokenSet,
  ): Promise<GithubConnectionRow | null> {
    const [updated] = await this.db
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
        ),
      )
      .returning();
    return updated ?? null;
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

  private async findByUserId(
    userId: string,
  ): Promise<GithubConnectionRow | null> {
    const [row] = await this.db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);
    return row ?? null;
  }

  private async findUsableByUserId(
    userId: string,
  ): Promise<GithubConnectionRow | null> {
    const [row] = await this.db
      .select()
      .from(githubConnections)
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
