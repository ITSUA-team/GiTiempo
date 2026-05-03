import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../config/env.validation';
import { GithubOauthClientService } from './github-oauth-client.service';

const configValues: Partial<Env> = {
  APP_URL: 'http://localhost:3000',
  GITHUB_APP_CLIENT_ID: 'client-id',
  GITHUB_APP_CLIENT_SECRET: 'client-secret',
};

function service(overrides: Partial<Env> = {}) {
  const values = { ...configValues, ...overrides } as Record<string, unknown>;
  return new GithubOauthClientService({
    get: (name: string) => values[name],
  } as unknown as ConfigService<Env, true>);
}

describe('GithubOauthClientService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds an authorization URL with state and PKCE challenge', () => {
    const url = new URL(
      service().buildAuthorizationUrl({
        state: 'state-1',
        codeChallenge: 'pkce',
      }),
    );
    expect(url.origin + url.pathname).toBe(
      'https://github.com/login/oauth/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/github/callback',
    );
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('code_challenge')).toBe('pkce');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('exchanges an authorization code without logging token material', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'ghu_access',
        expires_in: 10,
        refresh_token: 'ghr_refresh',
        refresh_token_expires_in: 20,
        token_type: 'bearer',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const tokens = await service().exchangeCode('code-1', 'verifier-1');
    expect(tokens.accessToken).toBe('ghu_access');
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body).toMatchObject({
      client_id: 'client-id',
      client_secret: 'client-secret',
      code: 'code-1',
      code_verifier: 'verifier-1',
    });
  });

  it('maps token exchange failures to safe service errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'bad_verification_code' }),
      }),
    );
    await expect(service().exchangeCode('bad', 'verifier')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
