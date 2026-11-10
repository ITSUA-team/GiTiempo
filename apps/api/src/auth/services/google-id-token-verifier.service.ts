import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Env } from '../../config/env.validation';
import { normalizeEmail } from '../../commons/utils/normalize-email';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const CACHE_MAX_MS = 60 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 5_000;
const UNKNOWN_KID_COOLDOWN_MS = 60_000;

export interface VerifiedGoogleIdToken {
  email: string;
  subject: string;
}

interface CachedKey {
  kid: string;
  pem: string;
}

/** Verifies a Google OIDC proof independently of Firebase provider profiles. */
@Injectable()
export class GoogleIdTokenVerifier {
  private keys = new Map<string, string>();
  private expiresAt = 0;
  private pending: Promise<void> | null = null;
  private nextUnknownKidRefreshAt = 0;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async verify(token: string): Promise<VerifiedGoogleIdToken> {
    const audiences = this.config.get('GOOGLE_OAUTH_CLIENT_IDS', {
      infer: true,
    });
    if (!audiences.length) throw new UnauthorizedException('Unauthorized');

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
      throw new UnauthorizedException('Unauthorized');
    }
    await this.loadKeys(false);
    if (!this.keys.has(decoded.header.kid)) {
      if (this.nextUnknownKidRefreshAt > Date.now()) {
        throw new UnauthorizedException('Unauthorized');
      }
      this.nextUnknownKidRefreshAt = Date.now() + UNKNOWN_KID_COOLDOWN_MS;
      await this.loadKeys(true);
    }
    const key = this.keys.get(decoded.header.kid);
    if (!key) throw new UnauthorizedException('Unauthorized');

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, key, {
        algorithms: ['RS256'],
        audience: audiences as [string, ...string[]],
        issuer: GOOGLE_ISSUERS as [string, ...string[]],
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    const now = Math.floor(Date.now() / 1_000);
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.email !== 'string' ||
      !payload.email ||
      payload.email_verified !== true ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.iat > now + 60 ||
      payload.exp <= payload.iat ||
      (payload.azp !== undefined &&
        (typeof payload.azp !== 'string' || !audiences.includes(payload.azp)))
    ) {
      throw new UnauthorizedException('Unauthorized');
    }
    return { subject: payload.sub, email: normalizeEmail(payload.email) };
  }

  private async loadKeys(force: boolean): Promise<void> {
    if (!force && this.expiresAt > Date.now()) return;
    if (this.pending) return this.pending;
    this.pending = this.fetchKeys().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async fetchKeys(): Promise<void> {
    let response: Response;
    try {
      response = await fetch(GOOGLE_JWKS_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!response.ok) throw new UnauthorizedException('Unauthorized');
    let body: { keys?: unknown[] } | null;
    try {
      body = (await response.json()) as { keys?: unknown[] };
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!body || !Array.isArray(body.keys))
      throw new UnauthorizedException('Unauthorized');
    const next = new Map<string, string>();
    for (const candidate of body.keys) {
      if (!candidate || typeof candidate !== 'object') continue;
      const key = candidate as Partial<CachedKey> & {
        kty?: string;
        n?: string;
        e?: string;
      };
      if (!key.kid || key.kty !== 'RSA' || !key.n || !key.e) continue;
      try {
        next.set(
          key.kid,
          createPublicKey({
            key: { kty: 'RSA', n: key.n, e: key.e },
            format: 'jwk',
          })
            .export({ type: 'spki', format: 'pem' })
            .toString(),
        );
      } catch {
        // Ignore malformed public keys from an otherwise valid key set.
      }
    }
    if (!next.size) throw new UnauthorizedException('Unauthorized');
    this.keys = next;
    this.expiresAt =
      Date.now() + this.cacheDuration(response.headers.get('cache-control'));
  }

  private cacheDuration(cacheControl: string | null): number {
    const seconds = /max-age=(\d+)/.exec(cacheControl ?? '')?.[1];
    return Math.min(CACHE_MAX_MS, Math.max(0, Number(seconds ?? 300) * 1_000));
  }
}
