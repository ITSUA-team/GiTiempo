import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../config/env.validation';
import {
  GithubAccountOauthClientService,
  normalizeScopes,
} from './github-account-oauth-client.service';

function service(): GithubAccountOauthClientService {
  const values: Partial<Env> = {
    APP_URL: 'https://api.example.test',
    GITHUB_SIGNIN_CLIENT_ID: 'oauth-client',
    GITHUB_SIGNIN_CLIENT_SECRET: 'oauth-secret',
  };
  return new GithubAccountOauthClientService({
    get: (key: keyof Env) => values[key],
  } as ConfigService<Env, true>);
}

describe('GithubAccountOauthClientService', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('uses the sign-in OAuth App and all agreed scopes', () => {
    const url = new URL(
      service().buildAuthorizationUrl({
        state: 'account_link.state',
        codeChallenge: 'pkce',
      }),
    );
    expect(url.searchParams.get('client_id')).toBe('oauth-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://api.example.test/auth/github/callback',
    );
    expect(url.searchParams.get('scope')).toBe(
      'user:email read:org read:project',
    );
  });

  it('retains actual granted scopes and accepts missing refresh metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'oauth-token',
          scope: 'user:email, user read:project',
        }),
      }),
    );
    await expect(
      service().exchangeCode('code', 'verifier'),
    ).resolves.toMatchObject({
      accessToken: 'oauth-token',
      refreshToken: null,
      tokenExpiresAt: null,
      scopes: ['read:project', 'user', 'user:email'],
    });
  });

  it('normalizes comma and whitespace scope separators', () => {
    expect(normalizeScopes('read:org, user:email  read:org')).toEqual([
      'read:org',
      'user:email',
    ]);
  });

  it('maps failed OAuth exchanges to a safe service exception', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'bad_verification_code' }),
      }),
    );
    await expect(
      service().exchangeCode('bad', 'verifier'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
