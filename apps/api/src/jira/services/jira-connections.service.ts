import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  JiraConnectionAccount,
  JiraConnectionStatusResponse,
  JiraSite,
} from '@gitiempo/shared';
import { and, eq, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { GithubEncryptionService } from '../../github/services/github-encryption.service';
import {
  jiraConnectionRowSelection,
  jiraConnections,
  type JiraConnectionRow,
} from '../schemas/jira-connections.schema';
import {
  JiraOauthClientService,
  JiraRefreshRejectedError,
  type JiraAccountProfile,
  type JiraTokenSet,
} from './jira-oauth-client.service';

const REFRESH_SKEW_MS = 60 * 1_000;

@Injectable()
export class JiraConnectionsService {
  private readonly refreshesInFlight = new Map<string, Promise<string>>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly encryption: GithubEncryptionService,
    private readonly oauthClient: JiraOauthClientService,
  ) {}

  async status(userId: string): Promise<JiraConnectionStatusResponse> {
    const row = await this.findByUserId(userId);

    if (!row || !row.connected || row.accessTokenEncrypted === null) {
      return { status: 'disconnected', account: null };
    }

    if (row.reauthorizationRequired) {
      return {
        status: 'reauthorization-required',
        account: this.toAccount(row),
      };
    }

    return { status: 'connected', account: this.toAccount(row) };
  }

  async upsertConnected(
    userId: string,
    profile: JiraAccountProfile,
    tokens: JiraTokenSet,
    sites: JiraSite[],
  ): Promise<JiraConnectionRow> {
    const now = new Date();
    const values = {
      atlassianAccountId: profile.atlassianAccountId,
      displayName: profile.displayName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      sites,
      accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
      refreshTokenEncrypted: this.encryption.encrypt(tokens.refreshToken),
      tokenExpiresAt: tokens.tokenExpiresAt,
      connected: true,
      reauthorizationRequired: false,
      updatedAt: now,
    };

    return (
      await this.db
        .insert(jiraConnections)
        .values({ userId, connectedAt: now, ...values })
        .onConflictDoUpdate({ target: jiraConnections.userId, set: values })
        .returning()
    )[0]!;
  }

  async disconnect(userId: string): Promise<void> {
    const row = await this.findByUserId(userId);
    if (!row) return;

    await this.db
      .update(jiraConnections)
      .set({
        connected: false,
        reauthorizationRequired: false,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(jiraConnections.id, row.id));
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const row = await this.findUsableByUserId(userId);
    if (!row) throw new NotFoundException('Jira connection not found');

    if (row.reauthorizationRequired) {
      throw new UnauthorizedException('Jira connection needs reauthorization');
    }

    if (this.isAccessTokenValid(row)) {
      return this.encryption.decrypt(row.accessTokenEncrypted!);
    }

    return this.refreshSingleFlight(row);
  }

  private refreshSingleFlight(row: JiraConnectionRow): Promise<string> {
    const inFlight = this.refreshesInFlight.get(row.userId);
    if (inFlight) return inFlight;

    const refresh = this.refreshAccessToken(row).finally(() => {
      this.refreshesInFlight.delete(row.userId);
    });
    this.refreshesInFlight.set(row.userId, refresh);
    return refresh;
  }

  private async refreshAccessToken(row: JiraConnectionRow): Promise<string> {
    const refreshToken = this.encryption.decrypt(row.refreshTokenEncrypted!);

    try {
      const tokens = await this.oauthClient.refresh(refreshToken);
      await this.db
        .update(jiraConnections)
        .set({
          accessTokenEncrypted: this.encryption.encrypt(tokens.accessToken),
          refreshTokenEncrypted: this.encryption.encrypt(tokens.refreshToken),
          tokenExpiresAt: tokens.tokenExpiresAt,
          reauthorizationRequired: false,
          updatedAt: new Date(),
        })
        .where(eq(jiraConnections.id, row.id));

      return tokens.accessToken;
    } catch (error) {
      if (error instanceof JiraRefreshRejectedError) {
        await this.markReauthorizationRequired(row.id);
        throw new UnauthorizedException(
          'Jira connection needs reauthorization',
        );
      }

      throw error;
    }
  }

  private async markReauthorizationRequired(id: string): Promise<void> {
    await this.db
      .update(jiraConnections)
      .set({ reauthorizationRequired: true, updatedAt: new Date() })
      .where(eq(jiraConnections.id, id));
  }

  private async findByUserId(
    userId: string,
  ): Promise<JiraConnectionRow | null> {
    const [row] = await this.db
      .select(jiraConnectionRowSelection)
      .from(jiraConnections)
      .where(eq(jiraConnections.userId, userId))
      .limit(1);
    return row ?? null;
  }

  private async findUsableByUserId(
    userId: string,
  ): Promise<JiraConnectionRow | null> {
    const [row] = await this.db
      .select(jiraConnectionRowSelection)
      .from(jiraConnections)
      .where(
        and(
          eq(jiraConnections.userId, userId),
          eq(jiraConnections.connected, true),
          isNotNull(jiraConnections.accessTokenEncrypted),
          isNotNull(jiraConnections.refreshTokenEncrypted),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private isAccessTokenValid(row: JiraConnectionRow): boolean {
    return (
      row.tokenExpiresAt !== null &&
      row.tokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS
    );
  }

  private toAccount(row: JiraConnectionRow): JiraConnectionAccount {
    return {
      accountId: row.atlassianAccountId,
      displayName: row.displayName,
      email: row.email,
      avatarUrl: row.avatarUrl,
      sites: row.sites,
      connectedAt: row.connectedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
