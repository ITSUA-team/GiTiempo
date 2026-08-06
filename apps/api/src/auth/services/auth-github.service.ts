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

export type GithubLoginApp = 'user' | 'admin' | 'extension';

const GITHUB_LOGIN_APPS: readonly GithubLoginApp[] = [
  'user',
  'admin',
  'extension',
];

/**
 * Resolves the `app` query value to a login target. Deliberately an explicit
 * match rather than "anything that is not admin is user": with a third target, a
 * typo would otherwise deliver a handoff code to the web app, where the
 * extension's authorization window never sees it and the user waits on a window
 * that will never resolve. An unrecognized or absent value is the user app.
 */
export function parseGithubLoginApp(value: string | undefined): GithubLoginApp {
  return GITHUB_LOGIN_APPS.find((app) => app === value) ?? 'user';
}

/**
 * Name of the HttpOnly cookie that binds a login transaction to the browser
 * that started it. The signed `state` carries only the hash of this cookie's
 * nonce, so a callback is honored only when the same browser presents it.
 */
export const GITHUB_OAUTH_STATE_COOKIE = 'gh_oauth_state';

/** Handoff codes are exchanged within seconds; a short TTL bounds the store. */
const HANDOFF_TTL_MS = 60_000;

/**
 * Outcome of redeeming a handoff code. The rejection reasons are for logs only:
 * the caller turns every one of them into the same opaque 401, so nothing here
 * tells a client which of them applied.
 */
type HandoffClaim =
  | { memberId: string }
  | { reason: 'unknown' | 'expired' | 'verifier' };

interface VerifiedGithubEmails {
  emails: string[];
  primaryEmail: string | null;
}

/** A challenge is the hex SHA-256 of the client's verifier, so its shape is fixed. */
function isChallenge(value: string | undefined): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

interface GithubStateClaims {
  purpose: 'gh-login-state';
  app: GithubLoginApp;
  nonceHash: string;
  /**
   * SHA-256 of a secret held by a public client, present only for the extension
   * target. See `startAuthorization` for why that target cannot use the cookie.
   */
  challenge?: string;
  /** Same-app absolute path to return to after login (protected-route redirect). */
  redirect?: string;
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
 * `github_connections`. The `state` is a JWT signed with `JWT_ACCESS_SECRET`
 * that omits the issuer/audience the access-token verifier requires and carries
 * a distinct `purpose`, so it can never pass as a session token; the handoff is
 * an opaque single-use code whose email is held server-side, never in the URL.
 * Only a primary + verified GitHub email is accepted, and the session is minted
 * for an already-existing member (no provisioning).
 */
@Injectable()
export class AuthGithubService {
  private readonly logger = new Logger(AuthGithubService.name);

  // Opaque handoff codes: the verified email is held here, keyed by an
  // unguessable random code, so it never travels in the redirect URL (where it
  // could leak via history, proxy logs, or telemetry — RFC 9700 §§4.2-4.3).
  // Codes are single-use and short-lived. In-memory is sufficient for a single
  // API instance; a shared store would be needed once the API is scaled out.
  private readonly pendingHandoffs = new Map<
    string,
    { memberId: string; expiresAt: number; challenge?: string }
  >();

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
  startAuthorization(
    app: GithubLoginApp,
    redirect?: string,
    challenge?: string,
  ): { url: string; stateNonce: string } {
    // Fail before the browser leaves for GitHub rather than at the callback: an
    // unconfigured destination would otherwise surface as a 503 on an API page
    // the user never asked to see, after they had already authorized.
    if (app === 'extension') {
      this.redirectBase(app);
      // Chrome's extension authorization window does not carry the HttpOnly
      // state cookie through to the callback, measured rather than assumed, so
      // the cookie cannot bind this target. The extension instead proves
      // possession of a secret at the session exchange, and refusing to start
      // without a challenge keeps every extension transaction bound to someone.
      if (!isChallenge(challenge)) {
        throw new UnauthorizedException('challenge_required');
      }
    }
    const stateNonce = randomBytes(32).toString('hex');
    const state = this.signState(
      app,
      this.hashNonce(stateNonce),
      // The extension has no in-app route to return to — its outcome is read off
      // the intercepted redirect URL — so a post-login target is meaningless
      // there and is dropped rather than signed into the state.
      app === 'extension' ? undefined : this.sanitizeRedirect(redirect),
      app === 'extension' ? challenge : undefined,
    );
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
    // signed `app` claim — not a hardcoded 'user' — decides which app to return
    // to; a denial from an admin-started flow must reopen the admin app. For the
    // extension this is load-bearing rather than cosmetic: its authorization
    // window resolves only once the navigation reaches the extension's own
    // redirect URL, so an outcome sent to a web login page would leave that
    // window pending forever. The user app is only a fallback for an absent or
    // unverifiable state, which by definition cannot be attributed to any client.
    const app = this.resolveStateApp(input.state);

    if (input.error) {
      return this.appRedirect(app, '/login', { githubError: 'denied' });
    }
    if (!input.code || !input.state) {
      return this.appRedirect(app, '/login', { githubError: 'state' });
    }

    // Minting a session additionally requires the state to be bound to THIS
    // browser: its nonce hash must match the HttpOnly cookie, so a state minted
    // (and GitHub-authorized) by an attacker cannot log a victim into the
    // attacker's account (login CSRF). A missing/mismatched cookie is a state error.
    let claims: GithubStateClaims;
    try {
      claims = this.verifyBoundState(input.state, input.stateNonce);
    } catch {
      return this.appRedirect(app, '/login', { githubError: 'state' });
    }

    try {
      const accessToken = await this.exchangeCode(input.code);
      const { emails, primaryEmail } =
        await this.fetchVerifiedEmails(accessToken);
      if (emails.length === 0) {
        return this.appRedirect(app, '/login', { githubError: 'email' });
      }

      const memberIds = await this.auth.resolveActiveMemberIdsByEmails(emails);
      if (memberIds.length === 0) {
        this.logger.warn({
          event: 'auth.github_login.no_member',
          verifiedEmailCount: emails.length,
        });
        return this.appRedirect(app, '/login', { githubError: 'nomember' });
      }

      const memberId =
        memberIds.length === 1
          ? memberIds[0]
          : await this.resolvePreferredMemberId(memberIds, primaryEmail);
      if (!memberId) {
        this.logger.warn({
          event: 'auth.github_login.ambiguous',
          matchedMemberCount: memberIds.length,
        });
        return this.appRedirect(app, '/login', { githubError: 'ambiguous' });
      }

      const handoff = this.createHandoff(memberId, claims.challenge);
      // Round-trip the protected-route redirect (signed into the state at /start)
      // to the SPA callback so it can return the user where they were headed; the
      // SPA re-validates it before navigating (email/Google `?redirect=` parity).
      const query: Record<string, string> = { code: handoff };
      if (claims.redirect) query.redirect = claims.redirect;
      return this.appRedirect(app, '/auth/github/callback', query);
    } catch (error) {
      this.logger.warn({
        event: 'auth.github_login.callback_failed',
        reason: error instanceof Error ? error.message : String(error),
      });
      return this.appRedirect(app, '/login', { githubError: 'failed' });
    }
  }

  async exchangeSession(code: string, verifier?: string): Promise<TokenPair> {
    const claim = this.claimHandoff(code, verifier);
    if (!('memberId' in claim)) {
      // The reason never reaches the client — every rejection is an opaque 401 —
      // but `verifier` is the one value here that indicates an attempt to redeem
      // someone else's handoff, and it is worth telling apart from a slow client
      // or a stale code in logs.
      this.logger.warn({
        event: 'auth.github_login.handoff_invalid',
        reason: claim.reason,
      });
      throw new UnauthorizedException('Unauthorized');
    }
    return this.auth.createSessionForMember(claim.memberId);
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

  private async resolvePreferredMemberId(
    matchedMemberIds: string[],
    primaryEmail: string | null,
  ): Promise<string | null> {
    if (!primaryEmail) {
      return null;
    }

    const primaryMemberIds = await this.auth.resolveActiveMemberIdsByEmails([
      primaryEmail,
    ]);
    const [preferred] = primaryMemberIds;

    return preferred && matchedMemberIds.includes(preferred) ? preferred : null;
  }

  private async fetchVerifiedEmails(
    accessToken: string,
  ): Promise<VerifiedGithubEmails> {
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
    if (!Array.isArray(entries)) {
      return { emails: [], primaryEmail: null };
    }

    const verified = entries.filter(
      (entry) => entry.verified === true && Boolean(entry.email),
    );

    return {
      emails: verified.map((entry) => entry.email as string),
      primaryEmail:
        verified.find((entry) => entry.primary === true)?.email ?? null,
    };
  }

  // --- Signed tokens ---------------------------------------------------------

  private signState(
    app: GithubLoginApp,
    nonceHash: string,
    redirect?: string,
    challenge?: string,
  ): string {
    const claims: GithubStateClaims = {
      purpose: 'gh-login-state',
      app,
      nonceHash,
    };
    if (redirect) claims.redirect = redirect;
    if (challenge) claims.challenge = challenge;
    return jwt.sign(claims, this.secret(), { expiresIn: '10m' });
  }

  /**
   * A post-login redirect target carried through the signed state. It originates
   * from the browser, so only a same-app absolute path is kept — never a
   * protocol-relative (`//host`) or absolute URL — and it is length-bounded. The
   * SPA still re-validates it (`normalizeRedirectTargetValue`) before navigating.
   */
  private sanitizeRedirect(redirect: string | undefined): string | undefined {
    if (
      typeof redirect !== 'string' ||
      redirect.length === 0 ||
      redirect.length > 2048 ||
      !redirect.startsWith('/') ||
      redirect.startsWith('//')
    ) {
      return undefined;
    }
    return redirect;
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
    // The extension is bound by proof of possession at the session exchange
    // instead of by cookie here, because its authorization window does not carry
    // the cookie. The binding is not skipped, only moved: a state without a
    // challenge cannot be redeemed, and `exchangeSession` demands the verifier.
    if (decoded.app === 'extension') {
      if (!isChallenge(decoded.challenge)) {
        throw new UnauthorizedException('invalid_state');
      }
      return decoded;
    }
    if (!cookieNonce || !this.nonceMatches(cookieNonce, decoded.nonceHash)) {
      throw new UnauthorizedException('state_not_bound');
    }
    return decoded;
  }

  /**
   * The client to return to, read from the state's signature-verified `app` claim.
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
        GITHUB_LOGIN_APPS.includes(decoded.app)
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

  /**
   * Issues an opaque single-use handoff code and stores the email against it.
   * The code carries no payload, so decoding it (from the URL, history, or
   * logs) reveals nothing — the email lives only server-side.
   */
  private createHandoff(memberId: string, challenge?: string): string {
    const code = randomBytes(32).toString('hex');
    this.pendingHandoffs.set(code, {
      memberId,
      expiresAt: Date.now() + HANDOFF_TTL_MS,
      ...(challenge ? { challenge } : {}),
    });
    return code;
  }

  /**
   * Consumes a handoff code, returning its email once, or null when the code is
   * unknown or expired. Deleting on read makes it single-use, so a replayed
   * callback URL cannot mint a second session.
   */
  private claimHandoff(code: string, verifier?: string): HandoffClaim {
    const entry = this.pendingHandoffs.get(code);
    // Purged after the lookup rather than before it: purging first would delete
    // this code as well and report it as `unknown`, collapsing "arrived too late"
    // into "never existed". The store is still swept on every claim either way.
    this.purgeExpiredHandoffs();
    if (!entry) return { reason: 'unknown' };
    // Delete before any further check, so a wrong verifier burns the code rather
    // than leaving it available for another guess.
    this.pendingHandoffs.delete(code);
    if (entry.expiresAt <= Date.now()) return { reason: 'expired' };
    if (entry.challenge && !this.verifierMatches(verifier, entry.challenge)) {
      return { reason: 'verifier' };
    }
    return { memberId: entry.memberId };
  }

  /**
   * Constant-time check that the caller holds the secret whose hash was signed
   * into the state. A challenged handoff without a verifier fails here, so the
   * extension's binding cannot be dropped by simply omitting the field.
   */
  private verifierMatches(
    verifier: string | undefined,
    expectedChallenge: string,
  ): boolean {
    if (!verifier) return false;
    const actual = Buffer.from(
      createHash('sha256').update(verifier).digest('hex'),
      'hex',
    );
    const expected = Buffer.from(expectedChallenge, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private purgeExpiredHandoffs(): void {
    const now = Date.now();
    for (const [code, entry] of this.pendingHandoffs) {
      if (entry.expiresAt <= now) this.pendingHandoffs.delete(code);
    }
  }

  // --- Config helpers --------------------------------------------------------

  private callbackUrl(): string {
    return new URL(
      '/auth/github/callback',
      this.requireConfig('APP_URL'),
    ).toString();
  }

  /**
   * Where a flow's outcome is delivered. Read only from configuration — never
   * from the request — because the handoff code rides in this URL, so a
   * caller-supplied destination would let anyone who can reach `/start` have a
   * code delivered to a host they control (RFC 9700 §4.1 exact-match redirects).
   */
  private redirectBase(app: GithubLoginApp): string {
    if (app === 'extension') {
      return this.requireConfig('GITHUB_SIGNIN_EXTENSION_REDIRECT_URL');
    }
    return this.requireConfig(
      app === 'admin' ? 'ADMIN_SPA_URL' : 'USER_SPA_URL',
    );
  }

  private appRedirect(
    app: GithubLoginApp,
    path: string,
    query: Record<string, string>,
  ): string {
    const base = this.redirectBase(app);
    // The extension has no route to load: Chrome intercepts the navigation as
    // soon as it matches the extension's redirect URL, so the outcome rides on
    // that URL's own query rather than on a path inside an app.
    const url = app === 'extension' ? new URL(base) : new URL(path, base);
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
