import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

interface GithubTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type: string;
}

export interface GithubTokenSet {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface GithubUserProfile {
  githubUserId: string;
  login: string;
  avatarUrl: string | null;
}

@Injectable()
export class GithubOauthClientService {
  private readonly logger = new Logger(GithubOauthClientService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  buildAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
  }): string {
    const clientId = this.requireConfig('GITHUB_APP_CLIENT_ID');
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('state', input.state);
    url.searchParams.set('code_challenge', input.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(
    code: string,
    codeVerifier: string,
  ): Promise<GithubTokenSet> {
    return this.requestToken({
      code,
      redirect_uri: this.callbackUrl(),
      code_verifier: codeVerifier,
    });
  }

  async refresh(refreshToken: string): Promise<GithubTokenSet> {
    return this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  async getCurrentUser(accessToken: string): Promise<GithubUserProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'gitiempo-api',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      this.logger.warn({
        event: 'github.user.fetch_failed',
        status: response.status,
      });
      throw new ServiceUnavailableException('GitHub API request failed');
    }
    const body = (await response.json()) as {
      id?: number | string;
      login?: string;
      avatar_url?: string | null;
    };
    if (body.id === undefined || !body.login) {
      throw new ServiceUnavailableException('GitHub API returned invalid user');
    }
    return {
      githubUserId: String(body.id),
      login: body.login,
      avatarUrl: body.avatar_url ?? null,
    };
  }

  callbackUrl(): string {
    const appUrl = this.requireConfig('APP_URL');
    return new URL('/github/callback', appUrl).toString();
  }

  private async requestToken(
    params: Record<string, string>,
  ): Promise<GithubTokenSet> {
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.requireConfig('GITHUB_APP_CLIENT_ID'),
          client_secret: this.requireConfig('GITHUB_APP_CLIENT_SECRET'),
          ...params,
        }),
      },
    );
    const body = (await response.json()) as GithubTokenResponse & {
      error?: string;
    };
    if (!response.ok || body.error) {
      this.logger.warn({
        event: 'github.oauth.token_failed',
        status: response.status,
        error: body.error,
      });
      throw new ServiceUnavailableException('GitHub OAuth request failed');
    }
    if (!body.access_token || !body.refresh_token) {
      throw new ServiceUnavailableException(
        'GitHub OAuth response missing token',
      );
    }
    const accessSeconds = body.expires_in ?? 28_800;
    const refreshSeconds = body.refresh_token_expires_in ?? 15_897_600;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      tokenExpiresAt: new Date(Date.now() + accessSeconds * 1_000),
      refreshTokenExpiresAt: new Date(Date.now() + refreshSeconds * 1_000),
    };
  }

  private requireConfig(key: keyof Env): string {
    const value = this.config.get(key, { infer: true });
    if (typeof value === 'string' && value.length > 0) return value;
    throw new ServiceUnavailableException(
      'GitHub integration is not configured',
    );
  }
}
