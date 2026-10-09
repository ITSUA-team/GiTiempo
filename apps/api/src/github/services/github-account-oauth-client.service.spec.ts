import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
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

  it('resolves its configuration through Nest dependency injection', async () => {
    const module = await Test.createTestingModule({
      providers: [
        GithubAccountOauthClientService,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            APP_URL: 'https://api.example.test',
            GITHUB_SIGNIN_CLIENT_ID: 'injected-oauth-client',
          }),
        },
      ],
    }).compile();

    try {
      const client = module.get(GithubAccountOauthClientService);
      const url = new URL(
        client.buildAuthorizationUrl({
          state: 'account_link.state',
          codeChallenge: 'pkce',
        }),
      );
      expect(url.searchParams.get('client_id')).toBe('injected-oauth-client');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://api.example.test/auth/github/callback',
      );
    } finally {
      await module.close();
    }
  });

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

  it.each([
    { expires_in: -1 },
    { expires_in: 1e100 },
    { refresh_token_expires_in: -1 },
    { refresh_token_expires_in: 1e100 },
  ])(
    'rejects malformed expiry metadata instead of treating it as non-expiring: %j',
    async (expiry) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'oauth-token', ...expiry }),
        }),
      );

      await expect(service().exchangeCode('code')).rejects.toMatchObject({
        response: { statusCode: 503 },
      });
    },
  );

  it('normalizes an empty optional refresh token to absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'oauth-token', refresh_token: '' }),
      }),
    );

    await expect(service().exchangeCode('code')).resolves.toMatchObject({
      refreshToken: null,
    });
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
    ).rejects.toMatchObject({
      response: {
        code: 'github_authorization_required',
      },
    });
  });

  it('maps malformed OAuth token payloads to a service exception', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      }),
    );

    await expect(
      service().exchangeCode('bad', 'verifier'),
    ).rejects.toMatchObject({ response: { statusCode: 503 } });
  });

  it('maps malformed GitHub profile payloads to a service exception', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      }),
    );

    await expect(service().getCurrentUser('oauth-token')).rejects.toMatchObject(
      { response: { statusCode: 503 } },
    );
  });
});
