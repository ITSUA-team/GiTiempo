import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JiraSite } from '@gitiempo/shared';
import type { Env } from '../../config/env.validation';

const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const RESOURCES_URL =
  'https://api.atlassian.com/oauth/token/accessible-resources';
const ME_URL = 'https://api.atlassian.com/me';
const SCOPES = 'read:jira-work read:me offline_access';

interface JiraTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

export interface JiraTokenSet {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}

export interface JiraAccountProfile {
  atlassianAccountId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

export class JiraRefreshRejectedError extends Error {
  constructor() {
    super('Atlassian rejected the refresh token');
    this.name = 'JiraRefreshRejectedError';
  }
}

@Injectable()
export class JiraOauthClientService {
  private readonly logger = new Logger(JiraOauthClientService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  buildAuthorizationUrl(input: { state: string }): string {
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('audience', 'api.atlassian.com');
    url.searchParams.set('client_id', this.requireConfig('JIRA_CLIENT_ID'));
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('state', input.state);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async exchangeCode(code: string): Promise<JiraTokenSet> {
    return this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.callbackUrl(),
    });
  }

  async refresh(refreshToken: string): Promise<JiraTokenSet> {
    return this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  async getCurrentUser(accessToken: string): Promise<JiraAccountProfile> {
    const body = await this.getJson<{
      account_id?: string;
      name?: string;
      email?: string | null;
      picture?: string | null;
    }>(ME_URL, accessToken);

    if (!body.account_id) {
      throw new ServiceUnavailableException(
        'Atlassian API returned invalid account',
      );
    }

    return {
      atlassianAccountId: body.account_id,
      displayName: body.name ?? body.account_id,
      email: body.email ?? null,
      avatarUrl: body.picture ?? null,
    };
  }

  async listAccessibleSites(accessToken: string): Promise<JiraSite[]> {
    const body = await this.getJson<
      Array<{ id?: string; name?: string; url?: string }>
    >(RESOURCES_URL, accessToken);

    if (!Array.isArray(body)) {
      return [];
    }

    return body
      .filter((site) => typeof site.id === 'string')
      .map((site) => ({
        cloudId: site.id!,
        name: site.name ?? site.id!,
        url: site.url ?? '',
      }));
  }

  callbackUrl(): string {
    return new URL('/jira/callback', this.requireConfig('APP_URL')).toString();
  }

  private async getJson<T>(url: string, accessToken: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      this.logger.warn({
        event: 'jira.api.fetch_failed',
        status: response.status,
        url,
      });
      throw new ServiceUnavailableException('Atlassian API request failed');
    }

    return (await response.json()) as T;
  }

  private async requestToken(
    params: Record<string, string>,
  ): Promise<JiraTokenSet> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.requireConfig('JIRA_CLIENT_ID'),
        client_secret: this.requireConfig('JIRA_CLIENT_SECRET'),
        ...params,
      }),
    });
    const body = (await response.json()) as JiraTokenResponse;

    if (!response.ok || body.error) {
      this.logger.warn({
        event: 'jira.oauth.token_failed',
        status: response.status,
        error: body.error,
      });

      if (
        params.grant_type === 'refresh_token' &&
        (response.status === 400 ||
          response.status === 401 ||
          response.status === 403)
      ) {
        throw new JiraRefreshRejectedError();
      }

      throw new ServiceUnavailableException('Atlassian OAuth request failed');
    }

    if (!body.access_token || !body.refresh_token) {
      throw new ServiceUnavailableException(
        'Atlassian OAuth response missing token',
      );
    }

    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 3_600) * 1_000),
    };
  }

  private requireConfig(key: keyof Env): string {
    const value = this.config.get(key, { infer: true });
    if (typeof value === 'string' && value.length > 0) return value;
    throw new ServiceUnavailableException('Jira integration is not configured');
  }
}
