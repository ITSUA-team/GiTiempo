import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import type { Env } from '../../config/env.validation';

const TEST_CONFIG: Partial<Env> = {
  JWT_ACCESS_SECRET: 'unit-test-access-secret-32-chars-minimum-aaaaaaaaaaaa',
  JWT_REFRESH_SECRET: 'unit-test-refresh-secret-32-chars-minimum-aaaaaaaaaaa',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  JWT_ISSUER: 'gitiempo-api-test',
  JWT_AUDIENCE: 'gitiempo-clients-test',
};

function buildService(overrides: Partial<Env> = {}) {
  const cfg = { ...TEST_CONFIG, ...overrides } as Record<string, unknown>;
  const config = {
    get: (key: string) => cfg[key],
  } as unknown as ConfigService<Env, true>;
  return new TokenService(config);
}

const SUBJECT = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  firebaseUid: 'fb-uid-1',
};

describe('TokenService', () => {
  let service: TokenService;

  beforeAll(() => {
    service = buildService();
  });

  describe('access tokens', () => {
    it('signs and verifies a round-trip', () => {
      const token = service.signAccess(SUBJECT);
      const payload = service.verifyAccess(token);
      expect(payload.sub).toBe(SUBJECT.sub);
      expect(payload.email).toBe(SUBJECT.email);
      expect(payload.firebaseUid).toBe(SUBJECT.firebaseUid);
      expect(payload.iss).toBe(TEST_CONFIG.JWT_ISSUER);
      expect(payload.aud).toBe(TEST_CONFIG.JWT_AUDIENCE);
      expect(typeof payload.iat).toBe('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('rejects a tampered signature', () => {
      const token = service.signAccess(SUBJECT);
      const parts = token.split('.');
      parts[2] = 'ZmFrZS1zaWduYXR1cmU'; // base64url("fake-signature")
      const tampered = parts.join('.');
      expect(() => service.verifyAccess(tampered)).toThrow();
    });

    it('rejects a token signed with a different secret', () => {
      const other = buildService({
        JWT_ACCESS_SECRET:
          'different-secret-also-32-chars-minimum-aaaaaaaaaaaaa',
      });
      const token = other.signAccess(SUBJECT);
      expect(() => service.verifyAccess(token)).toThrow();
    });

    it('rejects a token with wrong issuer', () => {
      const token = jwt.sign(
        {
          sub: SUBJECT.sub,
          email: SUBJECT.email,
          firebaseUid: SUBJECT.firebaseUid,
        },
        TEST_CONFIG.JWT_ACCESS_SECRET!,
        {
          algorithm: 'HS256',
          issuer: 'not-our-issuer',
          audience: TEST_CONFIG.JWT_AUDIENCE,
          expiresIn: '15m',
        },
      );
      expect(() => service.verifyAccess(token)).toThrow();
    });

    it('rejects a token with wrong audience', () => {
      const token = jwt.sign(
        {
          sub: SUBJECT.sub,
          email: SUBJECT.email,
          firebaseUid: SUBJECT.firebaseUid,
        },
        TEST_CONFIG.JWT_ACCESS_SECRET!,
        {
          algorithm: 'HS256',
          issuer: TEST_CONFIG.JWT_ISSUER,
          audience: 'not-our-audience',
          expiresIn: '15m',
        },
      );
      expect(() => service.verifyAccess(token)).toThrow();
    });

    it('rejects an expired token', () => {
      const token = jwt.sign(
        {
          sub: SUBJECT.sub,
          email: SUBJECT.email,
          firebaseUid: SUBJECT.firebaseUid,
        },
        TEST_CONFIG.JWT_ACCESS_SECRET!,
        {
          algorithm: 'HS256',
          issuer: TEST_CONFIG.JWT_ISSUER,
          audience: TEST_CONFIG.JWT_AUDIENCE,
          expiresIn: -1,
        },
      );
      expect(() => service.verifyAccess(token)).toThrow();
    });

    it('rejects a none-algorithm token', () => {
      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' }),
      ).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: SUBJECT.sub,
          email: SUBJECT.email,
          firebaseUid: SUBJECT.firebaseUid,
          iss: TEST_CONFIG.JWT_ISSUER,
          aud: TEST_CONFIG.JWT_AUDIENCE,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60,
        }),
      ).toString('base64url');
      const token = `${header}.${payload}.`;
      expect(() => service.verifyAccess(token)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('generates a unique random token and matching sha256 hash', () => {
      const a = service.generateRefreshToken();
      const b = service.generateRefreshToken();
      expect(a.token).not.toEqual(b.token);
      expect(a.hash).toHaveLength(64); // 32 bytes hex
      expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(service.hashRefreshToken(a.token)).toBe(a.hash);
    });

    it('compareRefreshHash returns true for a matching pair', () => {
      const { token, hash } = service.generateRefreshToken();
      expect(service.compareRefreshHash(token, hash)).toBe(true);
    });

    it('compareRefreshHash returns false for a non-matching token', () => {
      const a = service.generateRefreshToken();
      const b = service.generateRefreshToken();
      expect(service.compareRefreshHash(a.token, b.hash)).toBe(false);
    });

    it('compareRefreshHash rejects wrong-length hashes without throwing', () => {
      const { token } = service.generateRefreshToken();
      expect(service.compareRefreshHash(token, 'deadbeef')).toBe(false);
      expect(service.compareRefreshHash(token, '')).toBe(false);
    });
  });
});
