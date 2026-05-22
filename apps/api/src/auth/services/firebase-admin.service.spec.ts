import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

const verifyIdToken = vi.fn();
const getUserByEmail = vi.fn();
const createUser = vi.fn();
const generatePasswordResetLink = vi.fn();
const getAuth = vi.fn(() => ({
  verifyIdToken,
  getUserByEmail,
  createUser,
  generatePasswordResetLink,
}));
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

  it('reuses an existing invited Firebase user by email', async () => {
    getUserByEmail.mockResolvedValueOnce({
      uid: 'existing-user',
      email: 'invitee@example.com',
    });
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
      }),
    );

    await expect(
      svc.getOrCreateInvitedUserByEmail('invitee@example.com'),
    ).resolves.toEqual({
      uid: 'existing-user',
      email: 'invitee@example.com',
      isExistingUser: true,
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates an invited Firebase user when none exists yet', async () => {
    getUserByEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    createUser.mockResolvedValueOnce({
      uid: 'created-user',
      email: 'invitee@example.com',
    });
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
      }),
    );

    await expect(
      svc.getOrCreateInvitedUserByEmail('invitee@example.com'),
    ).resolves.toEqual({
      uid: 'created-user',
      email: 'invitee@example.com',
      isExistingUser: false,
    });
    expect(createUser).toHaveBeenCalledWith({
      email: 'invitee@example.com',
      emailVerified: false,
    });
  });

  it('maps provisioning failures to a generic error', async () => {
    getUserByEmail.mockRejectedValueOnce(new Error('boom'));
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
      }),
    );

    await expect(
      svc.getOrCreateInvitedUserByEmail('invitee@example.com'),
    ).rejects.toThrow('Failed to provision invited Firebase user');
  });

  it('generates a Firebase password setup link', async () => {
    generatePasswordResetLink.mockResolvedValueOnce(
      'https://firebase.test/reset?mode=resetPassword&oobCode=test-code&apiKey=ignored&lang=en',
    );
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
        USER_SPA_URL: 'http://localhost:5173',
      }),
    );

    await expect(
      svc.generatePasswordSetupLink(
        'invitee@example.com',
        'http://localhost:5173/invites/accept?token=invite-token',
      ),
    ).resolves.toBe(
      'http://localhost:5173/invites/password-setup?mode=resetPassword&oobCode=test-code&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Finvites%2Faccept%3Ftoken%3Dinvite-token',
    );
    expect(generatePasswordResetLink).toHaveBeenCalledWith(
      'invitee@example.com',
      {
        url: 'http://localhost:5173/invites/accept?token=invite-token',
      },
    );
  });

  it('preserves the Firebase continueUrl while ignoring unrelated query parameters', async () => {
    generatePasswordResetLink.mockResolvedValueOnce(
      'https://firebase.test/reset?mode=resetPassword&oobCode=test-code&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Finvites%2Faccept%3Ftoken%3Dinvite-token&tenantId=ignored',
    );
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
        USER_SPA_URL: 'http://localhost:5173',
      }),
    );

    await expect(
      svc.generatePasswordSetupLink(
        'invitee@example.com',
        'http://localhost:5173/invites/accept?token=invite-token',
      ),
    ).resolves.toBe(
      'http://localhost:5173/invites/password-setup?mode=resetPassword&oobCode=test-code&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Finvites%2Faccept%3Ftoken%3Dinvite-token',
    );
  });

  it('maps password setup link failures to a generic error', async () => {
    generatePasswordResetLink.mockRejectedValueOnce(
      new Error('invalid continue url'),
    );
    const svc = new RealFirebaseAdminService(
      makeConfig({
        FIREBASE_PROJECT_ID: 'p',
        FIREBASE_CLIENT_EMAIL: 'x@y.z',
        FIREBASE_PRIVATE_KEY: 'KEY',
        USER_SPA_URL: 'http://localhost:5173',
      }),
    );

    await expect(
      svc.generatePasswordSetupLink(
        'invitee@example.com',
        'http://localhost:5173/invites/accept?token=invite-token',
      ),
    ).rejects.toThrow('Failed to generate Firebase password setup link');
  });
});
