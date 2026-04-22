import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

const verifyIdToken = vi.fn();
const getAuth = vi.fn(() => ({ verifyIdToken }));
const initializeApp = vi.fn(() => ({ name: 'gitiempo-api' }));
const cert = vi.fn((opts: unknown) => opts);
const getApps = vi.fn(() => [] as Array<{ name: string }>);

vi.mock('firebase-admin/app', () => ({
  initializeApp: (...args: unknown[]) =>
    (initializeApp as (...args: unknown[]) => unknown)(...args),
  cert: (...args: unknown[]) =>
    (cert as (...args: unknown[]) => unknown)(...args),
  getApps: () => (getApps as () => unknown[])(),
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: (...args: unknown[]) =>
    (getAuth as (...args: unknown[]) => unknown)(...args),
}));

// Imported after vi.mock so the mocks are active.
import { RealFirebaseAdminService } from './firebase-admin.service';

function makeConfig(values: Partial<Env>) {
  return {
    get: (key: keyof Env) => values[key],
  } as unknown as ConfigService<Env, true>;
}

describe('RealFirebaseAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApps.mockReturnValue([]);
  });

  it('verifies a token with checkRevoked=true and returns the narrowed shape', async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: 'u1',
      email: 'a@b.com',
      name: 'Alice',
      picture: 'https://img',
      email_verified: true,
      some_extra_field: 'ignored',
    });
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
      }),
    );

    const decoded = await svc.verifyIdToken('raw-firebase-token');

    expect(verifyIdToken).toHaveBeenCalledWith('raw-firebase-token', true);
    expect(decoded).toEqual({
      uid: 'u1',
      email: 'a@b.com',
      name: 'Alice',
      picture: 'https://img',
      email_verified: true,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('reuses the initialized app across calls', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1' });
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
      }),
    );
    await svc.verifyIdToken('t1');
    await svc.verifyIdToken('t2');
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('maps firebase-admin verification errors to UnauthorizedException', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('auth/id-token-revoked'));
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
      }),
    );
    await expect(svc.verifyIdToken('bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws if credentials are missing when the app is first initialized', async () => {
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: undefined,
        FIREBASE_CLIENT_EMAIL: undefined,
        FIREBASE_PRIVATE_KEY: undefined,
      }),
    );
    await expect(svc.verifyIdToken('t')).rejects.toThrow(
      /Firebase Admin credentials/,
    );
  });
});
