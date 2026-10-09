import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import type { GithubUserProfile } from './github-oauth-client.service';

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
}

export interface GithubOAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scopes: string[];
}

/** Kept as an explicit account-flow name for auth-flow callers. */
export type GithubAccountTokenSet = GithubOAuthTokenSet;

/** OAuth App client for account identity and organization discovery. */
@Injectable()
export class GithubAccountOauthClientService {
  private readonly logger = new Logger(GithubAccountOauthClientService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  buildAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
  }): string {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set(
      'client_id',
      this.requireConfig('GITHUB_SIGNIN_CLIENT_ID'),
    );
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('state', input.state);
    url.searchParams.set('scope', 'user:email read:org read:project');
    url.searchParams.set('code_challenge', input.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(
    code: string,
    codeVerifier?: string,
  ): Promise<GithubOAuthTokenSet> {
    return this.requestToken({
      code,
      redirect_uri: this.callbackUrl(),
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });
  }

  async refresh(refreshToken: string): Promise<GithubOAuthTokenSet> {
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
        event: 'github.account.user_fetch_failed',
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

  /** OAuth App token revocation is best effort; local unlink remains authoritative. */
  async revoke(accessToken: string): Promise<boolean> {
    try {
      const credentials = Buffer.from(
        `${this.requireConfig('GITHUB_SIGNIN_CLIENT_ID')}:${this.requireConfig('GITHUB_SIGNIN_CLIENT_SECRET')}`,
      ).toString('base64');
      const response = await fetch(
        `https://api.github.com/applications/${this.requireConfig('GITHUB_SIGNIN_CLIENT_ID')}/token`,
        {
          method: 'DELETE',
          signal: AbortSignal.timeout(5_000),
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({ access_token: accessToken }),
        },
      );
      return response.ok || response.status === 404;
    } catch {
      return false;
    }
  }

  callbackUrl(): string {
    return new URL(
      '/auth/github/callback',
      this.requireConfig('APP_URL'),
    ).toString();
  }

  private async requestToken(
    params: Record<string, string>,
  ): Promise<GithubOAuthTokenSet> {
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.requireConfig('GITHUB_SIGNIN_CLIENT_ID'),
          client_secret: this.requireConfig('GITHUB_SIGNIN_CLIENT_SECRET'),
          ...params,
        }),
      },
    );
    const body = (await response.json()) as OAuthTokenResponse;
    if (!response.ok || body.error || !body.access_token) {
      this.logger.warn({
        event: 'github.account_oauth.token_failed',
        status: response.status,
        hasError: Boolean(body.error),
      });
      if ([400, 401, 403].includes(response.status)) {
        throw new UnauthorizedException(
          'GitHub OAuth authorization requires reconnection',
        );
      }
      throw new ServiceUnavailableException('GitHub OAuth request failed');
    }
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? null,
      tokenExpiresAt: expiryAt(body.expires_in),
      refreshTokenExpiresAt: expiryAt(body.refresh_token_expires_in),
      scopes: normalizeScopes(body.scope),
    };
  }

  private requireConfig(
    key: 'GITHUB_SIGNIN_CLIENT_ID' | 'GITHUB_SIGNIN_CLIENT_SECRET' | 'APP_URL',
  ): string {
    const value = this.config.get(key, { infer: true });
    if (typeof value === 'string' && value.length > 0) return value;
    throw new ServiceUnavailableException(
      'GitHub account linking is not configured',
    );
  }
}

export function normalizeScopes(scope: string | undefined): string[] {
  if (!scope) return [];
  return [
    ...new Set(
      scope
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort();
}

function expiryAt(seconds: number | undefined): Date | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  const value = new Date(Date.now() + seconds * 1_000);
  return Number.isNaN(value.getTime()) ? null : value;
}
