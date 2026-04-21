import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Env } from '../../config/env.validation';
import type { AuthUser } from '../types/auth-user';
import type { JwtPayload } from '../types/jwt-payload';

export interface GeneratedRefreshToken {
  /** Raw opaque token returned to the client (base64url, 43 chars). */
  token: string;
  /** `sha256(token)` hex digest; the only form persisted in the DB. */
  hash: string;
}

/**
 * Centralizes all cryptographic material for auth:
 *
 * - HS256 access-token sign/verify with `iss` + `aud` + `exp`
 * - Opaque refresh-token generation (32 random bytes, base64url)
 * - `sha256` hashing + constant-time comparison for stored refresh tokens
 *
 * See design decisions D1 and D4.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTtl: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: ConfigService<Env, true>) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.accessTtl = config.get('JWT_ACCESS_TTL', { infer: true });
    this.issuer = config.get('JWT_ISSUER', { infer: true });
    this.audience = config.get('JWT_AUDIENCE', { infer: true });
  }

  /**
   * Sign a short-lived HS256 access token.
   * Payload is kept minimal (see design D3).
   */
  signAccess(user: AuthUser): string {
    const options: SignOptions = {
      algorithm: 'HS256',
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.accessTtl as SignOptions['expiresIn'],
    };
    return jwt.sign(
      {
        sub: user.sub,
        email: user.email,
        firebaseUid: user.firebaseUid,
      },
      this.accessSecret,
      options,
    );
  }

  /**
   * Verify signature + `iss` + `aud` + `exp`. Throws on any failure.
   * Returns a strongly-typed payload.
   */
  verifyAccess(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.accessSecret, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
    });
    if (typeof decoded === 'string') {
      throw new Error('Unexpected access token payload (string form)');
    }
    const { sub, email, firebaseUid, iss, aud, iat, exp } =
      decoded as Partial<JwtPayload>;
    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof firebaseUid !== 'string' ||
      typeof iss !== 'string' ||
      typeof aud !== 'string' ||
      typeof iat !== 'number' ||
      typeof exp !== 'number'
    ) {
      throw new Error('Access token payload missing required claims');
    }
    return { sub, email, firebaseUid, iss, aud, iat, exp };
  }

  /**
   * Generate a new opaque refresh token.
   * 32 bytes → 43-char base64url string; `hash = sha256(token)` hex.
   */
  generateRefreshToken(): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');
    const hash = this.hashRefreshToken(token);
    return { token, hash };
  }

  /**
   * Hash a raw refresh token the same way stored hashes were produced.
   * Exposed so repositories / services can look up by hash without
   * round-tripping through `generateRefreshToken`.
   */
  hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Constant-time comparison of a raw refresh token against a stored
   * `sha256` hex digest. Lengths differing from the expected hash size
   * return false without running the timing-safe comparison (a length
   * mismatch is not a secret).
   */
  compareRefreshHash(rawToken: string, storedHash: string): boolean {
    const computed = this.hashRefreshToken(rawToken);
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  }
}
