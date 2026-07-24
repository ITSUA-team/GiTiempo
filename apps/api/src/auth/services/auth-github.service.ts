import { randomBytes } from 'node:crypto';
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

interface GithubStateClaims {
  purpose: 'gh-login-state';
  app: GithubLoginApp;
  nonce: string;
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
 * Backend "Sign in with GitHub": a login-scoped GitHub OAuth flow that reuses
 * the existing GitHub App credentials. The state and handoff tokens are signed
 * with `JWT_ACCESS_SECRET` but omit the issuer/audience the access-token
 * verifier requires and carry a distinct `purpose`, so they can never pass as a
 * session token. Only a primary + verified GitHub email is accepted, and the
 * session is minted for an already-existing member (no provisioning).
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

  buildStartUrl(app: GithubLoginApp): string {
    const state = this.signState(app);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set(
      'client_id',
      this.requireConfig('GITHUB_SIGNIN_CLIENT_ID'),
    );
    url.searchParams.set('redirect_uri', this.callbackUrl());
    url.searchParams.set('state', state);
    // Identity-only: read the user's email so an existing member can be matched.
    url.searchParams.set('scope', 'user:email');
    return url.toString();
  }

  async completeCallback(input: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    if (input.error) {
      return this.spaRedirect('user', '/login', { githubError: 'denied' });
    }
    if (!input.code || !input.state) {
      return this.spaRedirect('user', '/login', { githubError: 'state' });
    }

    // The state carries which app to return to; a failed state means we cannot
    // trust it, so fall back to the user app login with a state error.
    let app: GithubLoginApp;
    try {
      app = this.verifyState(input.state).app;
    } catch {
      return this.spaRedirect('user', '/login', { githubError: 'state' });
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

  private signState(app: GithubLoginApp): string {
    return jwt.sign(
      {
        purpose: 'gh-login-state',
        app,
        nonce: randomBytes(16).toString('hex'),
      },
      this.secret(),
      { expiresIn: '10m' },
    );
  }

  private verifyState(token: string): GithubStateClaims {
    const decoded = jwt.verify(token, this.secret()) as GithubStateClaims;
    if (decoded.purpose !== 'gh-login-state') {
      throw new UnauthorizedException('invalid_state');
    }
    return decoded;
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
