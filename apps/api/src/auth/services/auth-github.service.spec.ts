import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGithubService } from './auth-github.service';

const env: Record<string, string> = {
  GITHUB_SIGNIN_CLIENT_ID: 'signin-client',
  GITHUB_SIGNIN_CLIENT_SECRET: 'signin-secret',
  APP_URL: 'https://api.example.test',
  USER_SPA_URL: 'http://localhost:5173',
  ADMIN_SPA_URL: 'http://localhost:5174',
  JWT_ACCESS_SECRET: 'test-secret-value',
};
const config = { get: (key: string) => env[key] } as never;

const pair = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900 };

function createService() {
  const auth = { createSessionForVerifiedEmail: vi.fn(async () => pair) };
  return { svc: new AuthGithubService(config, auth as never), auth };
}

function mockGithub(emails: unknown) {
  return vi.fn(async (url: string) => {
    if (String(url).includes('access_token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'gh-token' }),
      } as Response;
    }
    if (String(url).includes('user/emails')) {
      return { ok: true, status: 200, json: async () => emails } as Response;
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

describe('AuthGithubService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('builds a start URL with client_id, redirect_uri, a signed state, and no PKCE', () => {
    const { svc } = createService();
    const url = new URL(svc.buildStartUrl('user'));

    expect(url.origin + url.pathname).toBe(
      'https://github.com/login/oauth/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('signin-client');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://api.example.test/auth/github/callback',
    );
    expect(url.searchParams.get('scope')).toBe('user:email');
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('code_challenge')).toBeNull();
  });

  it('completes the callback for a primary verified email and hands off a code', async () => {
    const { svc } = createService();
    const state = new URL(svc.buildStartUrl('user')).searchParams.get('state')!;
    vi.stubGlobal(
      'fetch',
      mockGithub([{ email: 'me@example.com', primary: true, verified: true }]),
    );

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state }),
    );

    expect(redirect.origin + redirect.pathname).toBe(
      'http://localhost:5173/auth/github/callback',
    );
    expect(redirect.searchParams.get('code')).toBeTruthy();
  });

  it('redirects with githubError=email when there is no verified primary email', async () => {
    const { svc } = createService();
    const state = new URL(svc.buildStartUrl('user')).searchParams.get('state')!;
    vi.stubGlobal(
      'fetch',
      mockGithub([{ email: 'me@example.com', primary: true, verified: false }]),
    );

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state }),
    );

    expect(redirect.pathname).toBe('/login');
    expect(redirect.searchParams.get('githubError')).toBe('email');
  });

  it('redirects with githubError=state on a bad state, defaulting to the user app', async () => {
    const { svc } = createService();

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state: 'not-a-jwt' }),
    );

    expect(redirect.origin).toBe('http://localhost:5173');
    expect(redirect.searchParams.get('githubError')).toBe('state');
  });

  it('exchanges a handoff code into a session for the verified email', async () => {
    const { svc, auth } = createService();
    const state = new URL(svc.buildStartUrl('admin')).searchParams.get(
      'state',
    )!;
    vi.stubGlobal(
      'fetch',
      mockGithub([
        { email: 'admin@example.com', primary: true, verified: true },
      ]),
    );
    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state }),
    );
    expect(redirect.origin).toBe('http://localhost:5174');
    const handoff = redirect.searchParams.get('code')!;

    const result = await svc.exchangeSession(handoff);

    expect(auth.createSessionForVerifiedEmail).toHaveBeenCalledWith(
      'admin@example.com',
    );
    expect(result).toEqual(pair);
  });

  it('rejects an invalid handoff code', async () => {
    const { svc } = createService();
    await expect(svc.exchangeSession('garbage')).rejects.toThrow();
  });
});
