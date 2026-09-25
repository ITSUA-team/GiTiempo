import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import type { Env } from '../../config/env.validation';

const API_URL = 'https://api.github.com';
const REFRESH_SKEW_MS = 60_000;

/** A requested installation scope is not granted by the GitHub App. */
export class GithubInstallationTokenPermissionError extends Error {}

type CachedToken = {
  token: string;
  expiresAt: number;
  authorizationVersion: number;
};
type InstallationTokenResponse = { token?: string; expires_at?: string };
export type InstallationPermission =
  | 'issues'
  | 'metadata'
  | 'organization_projects'
  | 'members';
type TokenInput = {
  installationId: string;
  authorizationVersion: number;
  repositories?: string[];
  permissions?: Partial<Record<InstallationPermission, 'read'>>;
};

/** Server-only GitHub App credential boundary. Tokens never leave this service. */
@Injectable()
export class GithubInstallationTokenProviderService {
  private readonly logger = new Logger(
    GithubInstallationTokenProviderService.name,
  );
  private readonly cache = new Map<string, CachedToken>();
  private readonly renewals = new Map<string, Promise<string>>();

  constructor(private readonly config: ConfigService<Env, true>) {}

  async getToken(input: TokenInput): Promise<string> {
    const key = this.cacheKey(input);
    const cached = this.cache.get(key);
    if (
      cached &&
      cached.authorizationVersion === input.authorizationVersion &&
      cached.expiresAt > Date.now() + REFRESH_SKEW_MS
    )
      return cached.token;
    const inFlight = this.renewals.get(key);
    if (inFlight) return inFlight;
    const renewal = this.mint(input).finally(() => this.renewals.delete(key));
    this.renewals.set(key, renewal);
    return renewal;
  }

  invalidate(installationId: string): void {
    for (const key of this.cache.keys())
      if (key.startsWith(`${installationId}:`)) this.cache.delete(key);
  }

  async appToken(): Promise<string> {
    const appId = this.required('GITHUB_APP_ID');
    const privateKey = this.required('GITHUB_APP_PRIVATE_KEY');
    try {
      return sign({}, privateKey, {
        algorithm: 'RS256',
        issuer: appId,
        audience: 'api.github.com',
        expiresIn: '9m',
      });
    } catch {
      throw new ServiceUnavailableException(
        'GitHub App integration is not configured',
      );
    }
  }

  private async mint(input: TokenInput): Promise<string> {
    const appToken = await this.appToken();
    let response: Response;
    try {
      response = await this.mintOnce(appToken, input);
    } catch {
      // Retry transport failures once. A response denial is never retried.
      response = await this.mintOnce(appToken, input);
    }
    if (!response.ok && this.isTransientStatus(response.status)) {
      response = await this.mintOnce(appToken, input);
    }
    if (!response.ok) {
      this.logger.warn({
        event: 'github.installation_token.failed',
        status: response.status,
        installationId: input.installationId,
      });
      if (
        response.status === 403 &&
        (response.headers.get('x-ratelimit-remaining') === '0' ||
          response.headers.has('retry-after'))
      ) {
        throw new ServiceUnavailableException(
          'GitHub installation access is temporarily unavailable',
        );
      }
      if ([403, 422].includes(response.status)) {
        throw new GithubInstallationTokenPermissionError();
      }
      throw new ServiceUnavailableException(
        'GitHub installation access is unavailable',
      );
    }
    const body = (await response.json()) as InstallationTokenResponse;
    const expiresAt = body.expires_at
      ? new Date(body.expires_at).getTime()
      : Number.NaN;
    if (!body.token || !Number.isFinite(expiresAt))
      throw new ServiceUnavailableException(
        'GitHub installation access is unavailable',
      );
    const key = this.cacheKey(input);
    this.cache.set(key, {
      token: body.token,
      expiresAt,
      authorizationVersion: input.authorizationVersion,
    });
    return body.token;
  }

  private isTransientStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private headers(token: string): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'gitiempo-api',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  private async mintOnce(
    appToken: string,
    input: TokenInput,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      return await fetch(
        `${API_URL}/app/installations/${encodeURIComponent(input.installationId)}/access_tokens`,
        {
          method: 'POST',
          headers: this.headers(appToken),
          body: JSON.stringify({
            ...(input.repositories?.length
              ? { repositories: input.repositories }
              : {}),
            ...(input.permissions ? { permissions: input.permissions } : {}),
          }),
          signal: controller.signal,
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'GitHub installation access is unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private cacheKey(input: TokenInput): string {
    const repositories = [...(input.repositories ?? [])].sort().join(',');
    const permissions = Object.entries(input.permissions ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(',');
    return `${input.installationId}:${input.authorizationVersion}:${repositories}:${permissions}`;
  }

  private required(key: 'GITHUB_APP_ID' | 'GITHUB_APP_PRIVATE_KEY'): string {
    const value = this.config.get(key, { infer: true });
    if (!value)
      throw new ServiceUnavailableException(
        'GitHub App integration is not configured',
      );
    return value;
  }
}
