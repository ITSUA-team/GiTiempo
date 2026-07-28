import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGithubService, type GithubLoginApp } from './auth-github.service';

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

// Mirrors the controller: start a transaction and keep both the signed state
// and the nonce the browser would hold in its HttpOnly cookie.
function startTransaction(
  svc: AuthGithubService,
  app: GithubLoginApp = 'user',
): { state: string; stateNonce: string } {
  const { url, stateNonce } = svc.startAuthorization(app);
  const state = new URL(url).searchParams.get('state')!;
  return { state, stateNonce };
}

describe('AuthGithubService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('builds a start URL with client_id, redirect_uri, a signed state, and no PKCE', () => {
    const { svc } = createService();
    const { url: startUrl, stateNonce } = svc.startAuthorization('user');
    const url = new URL(startUrl);

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
    // The browser-bound nonce is returned for the caller's cookie and never
    // travels inside the state (which carries only its hash).
    expect(stateNonce).toMatch(/^[0-9a-f]{64}$/);
    expect(url.searchParams.get('state')).not.toContain(stateNonce);
  });

  it('binds the state to an HttpOnly, SameSite=Lax cookie, Secure only in production', () => {
    const { svc } = createService();
    expect(svc.stateCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/auth/github',
      secure: false,
    });

    const prod = new AuthGithubService(
      {
        get: (key: string) => (key === 'NODE_ENV' ? 'production' : env[key]),
      } as never,
      { createSessionForVerifiedEmail: vi.fn() } as never,
    );
    expect(prod.stateCookieOptions().secure).toBe(true);
  });

  it('completes the callback for a primary verified email and hands off a code', async () => {
    const { svc } = createService();
    const { state, stateNonce } = startTransaction(svc);
    vi.stubGlobal(
      'fetch',
      mockGithub([{ email: 'me@example.com', primary: true, verified: true }]),
    );

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
    );

    expect(redirect.origin + redirect.pathname).toBe(
      'http://localhost:5173/auth/github/callback',
    );
    expect(redirect.searchParams.get('code')).toBeTruthy();
  });

  it('round-trips a safe redirect target through the state to the SPA callback', async () => {
    const { svc } = createService();
    const { url, stateNonce } = svc.startAuthorization('user', '/time-entries');
    const state = new URL(url).searchParams.get('state')!;
    vi.stubGlobal(
      'fetch',
      mockGithub([{ email: 'me@example.com', primary: true, verified: true }]),
    );

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
    );

    expect(redirect.pathname).toBe('/auth/github/callback');
    expect(redirect.searchParams.get('code')).toBeTruthy();
    expect(redirect.searchParams.get('redirect')).toBe('/time-entries');
  });

  it('drops an unsafe redirect target so the callback cannot open-redirect', async () => {
    const { svc } = createService();
    const { url, stateNonce } = svc.startAuthorization(
      'user',
      '//evil.example/escape',
    );
    const state = new URL(url).searchParams.get('state')!;
    vi.stubGlobal(
      'fetch',
      mockGithub([{ email: 'me@example.com', primary: true, verified: true }]),
    );

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
    );

    expect(redirect.searchParams.get('code')).toBeTruthy();
    expect(redirect.searchParams.get('redirect')).toBeNull();
  });

  it('redirects with githubError=email when there is no verified primary email', async () => {
    const { svc } = createService();
    const { state, stateNonce } = startTransaction(svc);
    vi.stubGlobal(
      'fetch',
      mockGithub([{ email: 'me@example.com', primary: true, verified: false }]),
    );

    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
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

  it('rejects a callback whose state is not bound to the browser (login CSRF)', async () => {
    const { svc } = createService();
    const { state } = startTransaction(svc);
    // A state minted (and GitHub-authorized) in the attacker's browser, replayed
    // in the victim's: without the initiating browser's cookie — or with a
    // different nonce — the login must not complete. No token exchange is even
    // attempted, so fetch is never called.
    const withoutCookie = new URL(
      await svc.completeCallback({ code: 'abc', state }),
    );
    const wrongCookie = new URL(
      await svc.completeCallback({
        code: 'abc',
        state,
        stateNonce: 'a'.repeat(64),
      }),
    );

    expect(withoutCookie.searchParams.get('githubError')).toBe('state');
    expect(wrongCookie.searchParams.get('githubError')).toBe('state');
  });

  it('returns a GitHub denial to the app named in the state, not always the user app', async () => {
    const { svc } = createService();
    const { state } = startTransaction(svc, 'admin');

    // GitHub echoes the state on a denial; the flow began in admin-web, so the
    // denial must reopen the admin SPA — no session, so no cookie is required.
    const redirect = new URL(
      await svc.completeCallback({ error: 'access_denied', state }),
    );

    expect(redirect.origin).toBe('http://localhost:5174');
    expect(redirect.pathname).toBe('/login');
    expect(redirect.searchParams.get('githubError')).toBe('denied');
  });

  it('falls back to the user app for a denial with no resolvable state', async () => {
    const { svc } = createService();

    const redirect = new URL(
      await svc.completeCallback({ error: 'access_denied' }),
    );

    expect(redirect.origin).toBe('http://localhost:5173');
    expect(redirect.searchParams.get('githubError')).toBe('denied');
  });

  it('exchanges a handoff code into a session for the verified email', async () => {
    const { svc, auth } = createService();
    const { state, stateNonce } = startTransaction(svc, 'admin');
    vi.stubGlobal(
      'fetch',
      mockGithub([
        { email: 'admin@example.com', primary: true, verified: true },
      ]),
    );
    const redirect = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
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

  it('rejects a replayed handoff code (single-use)', async () => {
    const { svc } = createService();
    const { state, stateNonce } = startTransaction(svc);
    vi.stubGlobal(
      'fetch',
      mockGithub([
        { email: 'admin@example.com', primary: true, verified: true },
      ]),
    );
    const handoff = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
    ).searchParams.get('code')!;

    await svc.exchangeSession(handoff);
    await expect(svc.exchangeSession(handoff)).rejects.toThrow();
  });

  it('issues an opaque handoff code that does not embed the email', async () => {
    const { svc } = createService();
    const { state, stateNonce } = startTransaction(svc, 'admin');
    vi.stubGlobal(
      'fetch',
      mockGithub([
        { email: 'admin@example.com', primary: true, verified: true },
      ]),
    );
    const code = new URL(
      await svc.completeCallback({ code: 'abc', state, stateNonce }),
    ).searchParams.get('code')!;

    // Opaque random code: no JWT payload to decode and the email never appears,
    // so the redirect URL, history, or logs cannot leak it.
    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(code).not.toContain('admin@example.com');
    expect(code.includes('.')).toBe(false);
  });
});
