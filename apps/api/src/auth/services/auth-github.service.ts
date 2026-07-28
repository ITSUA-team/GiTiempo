import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Env } from '../../config/env.validation';
import { AuthService, type TokenPair } from './auth.service';

export type GithubLoginApp = 'user' | 'admin';

/**
 * Name of the HttpOnly cookie that binds a login transaction to the browser
 * that started it. The signed `state` carries only the hash of this cookie's
 * nonce, so a callback is honored only when the same browser presents it.
 */
export const GITHUB_OAUTH_STATE_COOKIE = 'gh_oauth_state';

interface GithubStateClaims {
  purpose: 'gh-login-state';
  app: GithubLoginApp;
  nonceHash: string;
}

interface GithubHandoffClaims {
  purpose: 'gh-login-handoff';
  email: string;
  jti: string;
  exp?: number;
}

interface GithubEmailEntry {
  email?: string;
  primary?: boolean;
  verified?: boolean;
}

/**
 * Backend "Sign in with GitHub": a login-scoped GitHub OAuth flow that uses a
 * dedicated identity-only OAuth App (`GITHUB_SIGNIN_CLIENT_ID`/`_SECRET`),
 * separate from the GitHub App integration — it never touches `GITHUB_APP_*` or
 * `github_connections`. The state and handoff tokens are signed with
 * `JWT_ACCESS_SECRET` but omit the issuer/audience the access-token verifier
 * requires and carry a distinct `purpose`, so they can never pass as a session
 * token. Only a primary + verified GitHub email is accepted, and the session is
 * minted for an already-existing member (no provisioning).
 */
@Injectable()
export class AuthGithubService {
  private readonly logger = new Logger(AuthGithubService.name);

  // Handoff codes are single-use: a consumed `jti` is remembered until the JWT
  // would expire anyway, so a replay within the 60s TTL is rejected. In-memory
  // is sufficient for a single API instance; a shared store would be needed if
  // the API is ever horizontally scaled.
  private readonly consumedHandoffs = new Map<string, number>();

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly auth: AuthService,
  ) {}

  /**
   * Starts a login transaction. The returned `stateNonce` MUST be stored by the
   * caller in an HttpOnly, SameSite=Lax cookie (see `stateCookieOptions`): the
   * signed `state` carries only the nonce's hash, so `completeCallback` accepts
   * a callback only when the browser presents a cookie whose nonce matches. This
   * binds the flow to the user agent that began it (RFC 9700 §4.7.1) — a state
   * minted in one browser cannot complete a login in another (login CSRF).
   */
  startAuthorization(app: GithubLoginApp): { url: string; stateNonce: string } {
    const stateNonce = randomBytes(32).toString('hex');
    const state = this.signState(app, this.hashNonce(stateNonce));
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set(
      'client_id',
      this.requireConfig('GITHUB_SIGNIN_CLIENT_ID'),
    );
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('state', state);
    // Identity-only: read the user's email so an existing member can be matched.
    url.searchParams.set('scope', 'user:email');
    return { url: url.toString(), stateNonce };
  }

  /**
   * Cookie options for the state-binding nonce. `SameSite=Lax` so the top-level
   * GET redirect back from GitHub still carries it (Strict would drop it);
   * `HttpOnly` so script cannot read it; scoped to `/auth/github` and expiring
   * with the 10-minute state; `Secure` in production (HTTPS).
   */
  stateCookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'lax',
      path: '/auth/github',
      maxAge: 10 * 60 * 1000,
    };
  }

  async completeCallback(input: {
    code?: string;
    state?: string;
    error?: string;
    /** Nonce from the browser-bound HttpOnly cookie set at `startAuthorization`. */
    stateNonce?: string;
  }): Promise<string> {
    // The state is echoed on every GitHub redirect (including a denial), so its
    // signed `app` claim — not a hardcoded 'user' — decides which SPA to return
    // to; a denial from an admin-started flow must reopen the admin app. The user
    // app is only a fallback for an absent or unverifiable state.
    const app = this.resolveStateApp(input.state);

    if (input.error) {
      return this.spaRedirect(app, '/login', { githubError: 'denied' });
    }
    if (!input.code || !input.state) {
      return this.spaRedirect(app, '/login', { githubError: 'state' });
    }

    // Minting a session additionally requires the state to be bound to THIS
    // browser: its nonce hash must match the HttpOnly cookie, so a state minted
    // (and GitHub-authorized) by an attacker cannot log a victim into the
    // attacker's account (login CSRF). A missing/mismatched cookie is a state error.
    try {
      this.verifyBoundState(input.state, input.stateNonce);
    } catch {
      return this.spaRedirect(app, '/login', { githubError: 'state' });
    }

    try {
      const accessToken = await this.exchangeCode(input.code);
      const email = await this.fetchVerifiedPrimaryEmail(accessToken);
      if (!email) {
        return this.spaRedirect(app, '/login', { githubError: 'email' });
      }

      const handoff = this.signHandoff(email);
      return this.spaRedirect(app, '/auth/github/callback', { code: handoff });
    } catch (error) {
      this.logger.warn({
        event: 'auth.github_login.callback_failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      return this.spaRedirect(app, '/login', { githubError: 'failed' });
    }
  }

  async exchangeSession(code: string): Promise<TokenPair> {
    const email = this.verifyHandoff(code);
    return this.auth.createSessionForVerifiedEmail(email);
  }

  // --- OAuth mechanics -------------------------------------------------------

  private async exchangeCode(code: string): Promise<string> {
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
          code,
          redirect_uri: this.callbackUrl(),
        }),
      },
    );
    const body = (await response.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!response.ok || body.error || !body.access_token) {
      this.logger.warn({
        event: 'auth.github_login.token_failed',
        status: response.status,
        error: body.error,
      });
      throw new ServiceUnavailableException('GitHub OAuth request failed');
    }
    return body.access_token;
  }

  private async fetchVerifiedPrimaryEmail(
    accessToken: string,
  ): Promise<string | null> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'gitiempo-api',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      this.logger.warn({
        event: 'auth.github_login.email_fetch_failed',
        status: response.status,
      });
      throw new ServiceUnavailableException('GitHub API request failed');
    }
    const entries = (await response.json()) as GithubEmailEntry[];
    const primary = Array.isArray(entries)
      ? entries.find((e) => e.primary === true && e.verified === true)
      : undefined;
    return primary?.email ?? null;
  }

  // --- Signed tokens ---------------------------------------------------------

  private signState(app: GithubLoginApp, nonceHash: string): string {
    return jwt.sign(
      { purpose: 'gh-login-state', app, nonceHash },
      this.secret(),
      { expiresIn: '10m' },
    );
  }

  private verifyBoundState(
    token: string,
    cookieNonce: string | undefined,
  ): GithubStateClaims {
    const decoded = jwt.verify(token, this.secret()) as GithubStateClaims;
    if (
      decoded.purpose !== 'gh-login-state' ||
      typeof decoded.nonceHash !== 'string'
    ) {
      throw new UnauthorizedException('invalid_state');
    }
    if (!cookieNonce || !this.nonceMatches(cookieNonce, decoded.nonceHash)) {
      throw new UnauthorizedException('state_not_bound');
    }
    return decoded;
  }

  /**
   * The SPA to return to, read from the state's signature-verified `app` claim.
   * This is a redirect target, not a security decision, so — unlike
   * `verifyBoundState` — it does not require the browser-nonce binding: a denial
   * or a failed exchange still lands the user in the app they started from.
   * Falls back to the user app when the state is absent or unverifiable.
   */
  private resolveStateApp(state: string | undefined): GithubLoginApp {
    if (!state) return 'user';
    try {
      const decoded = jwt.verify(state, this.secret()) as GithubStateClaims;
      if (
        decoded.purpose === 'gh-login-state' &&
        (decoded.app === 'user' || decoded.app === 'admin')
      ) {
        return decoded.app;
      }
    } catch {
      // Unverifiable state → user-app fallback below.
    }
    return 'user';
  }

  private hashNonce(nonce: string): string {
    return createHash('sha256').update(nonce).digest('hex');
  }

  /** Constant-time compare of a cookie nonce against the state's stored hash. */
  private nonceMatches(nonce: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashNonce(nonce), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private signHandoff(email: string): string {
    return jwt.sign(
      {
        purpose: 'gh-login-handoff',
        email,
        jti: randomBytes(16).toString('hex'),
      },
      this.secret(),
      { expiresIn: '60s' },
    );
  }

  private verifyHandoff(token: string): string {
    let decoded: GithubHandoffClaims;
    try {
      decoded = jwt.verify(token, this.secret()) as GithubHandoffClaims;
    } catch (error) {
      this.logger.warn({
        event: 'auth.github_login.handoff_invalid',
        reason: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedException('Unauthorized');
    }
    if (
      decoded.purpose !== 'gh-login-handoff' ||
      !decoded.email ||
      !decoded.jti
    ) {
      this.logger.warn({ event: 'auth.github_login.handoff_bad_claims' });
      throw new UnauthorizedException('Unauthorized');
    }
    if (!this.claimHandoff(decoded.jti, decoded.exp)) {
      this.logger.warn({ event: 'auth.github_login.handoff_replayed' });
      throw new UnauthorizedException('Unauthorized');
    }
    return decoded.email;
  }

  /** Single-use: returns false if this handoff jti was already consumed. */
  private claimHandoff(jti: string, exp?: number): boolean {
    const now = Date.now();
    for (const [key, expiresAt] of this.consumedHandoffs) {
      if (expiresAt <= now) this.consumedHandoffs.delete(key);
    }
    if (this.consumedHandoffs.has(jti)) return false;
    this.consumedHandoffs.set(jti, exp ? exp * 1000 : now + 60_000);
    return true;
  }

  // --- Config helpers --------------------------------------------------------

  private callbackUrl(): string {
    return new URL(
      '/auth/github/callback',
      this.requireConfig('APP_URL'),
    ).toString();
  }

  private spaRedirect(
    app: GithubLoginApp,
    path: string,
    query: Record<string, string>,
  ): string {
    const base = this.requireConfig(
      app === 'admin' ? 'ADMIN_SPA_URL' : 'USER_SPA_URL',
    );
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private secret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  private requireConfig(key: keyof Env): string {
    const value = this.config.get(key, { infer: true });
    if (typeof value === 'string' && value.length > 0) return value;
    throw new ServiceUnavailableException('GitHub sign-in is not configured');
  }
}
