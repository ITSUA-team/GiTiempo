import { describe, it, expect, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { FakeFirebaseAdminService } from './firebase-admin.fake';

describe('FakeFirebaseAdminService', () => {
  let fake: FakeFirebaseAdminService;

  beforeEach(() => {
    fake = new FakeFirebaseAdminService();
  });

  it('decodes `test:<uid>:<email>` tokens', async () => {
    const decoded = await fake.verifyIdToken(
      'test:admin-uid:admin@example.com',
    );
    expect(decoded).toEqual({
      uid: 'admin-uid',
      email: 'admin@example.com',
      email_verified: true,
    });
  });

  it('includes the optional name segment', async () => {
    const decoded = await fake.verifyIdToken('test:u1:alice@example.com:Alice');
    expect(decoded.name).toBe('Alice');
    expect(decoded.uid).toBe('u1');
    expect(decoded.email).toBe('alice@example.com');
  });

  it('rejects tokens without the `test:` prefix', async () => {
    await expect(
      fake.verifyIdToken('eyJhbGciOiJSUzI1NiI...'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed `test:` tokens', async () => {
    await expect(fake.verifyIdToken('test:onlyuid')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(fake.verifyIdToken('test::no@uid.com')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects non-string tokens', async () => {
    await expect(
      fake.verifyIdToken(undefined as unknown as string),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reuses an invited Firebase user by normalized email', async () => {
    const first = await fake.getOrCreateInvitedUserByEmail(
      'Invitee@Example.com',
    );
    const second = await fake.getOrCreateInvitedUserByEmail(
      'invitee@example.com',
    );

    expect(first).toEqual({
      uid: 'fake-firebase-1',
      email: 'invitee@example.com',
      isExistingUser: false,
    });
    expect(second).toEqual({
      uid: 'fake-firebase-1',
      email: 'invitee@example.com',
      isExistingUser: true,
    });
  });

  it('creates and deletes a registered Firebase email/password user', async () => {
    const created = await fake.createEmailPasswordUser({
      email: 'Owner@Example.com',
      password: 'password123',
      displayName: 'Owner Person',
    });

    expect(created).toEqual({
      uid: 'fake-firebase-user-1',
      email: 'owner@example.com',
      displayName: 'Owner Person',
    });

    await expect(fake.deleteUser(created.uid)).resolves.toBeUndefined();
  });

  it('rejects duplicate registration emails', async () => {
    await fake.createEmailPasswordUser({
      email: 'Owner@Example.com',
      password: 'password123',
      displayName: 'Owner Person',
    });

    await expect(
      fake.createEmailPasswordUser({
        email: 'owner@example.com',
        password: 'password123',
        displayName: 'Owner Person',
      }),
    ).rejects.toMatchObject({
      code: 'auth/email-already-exists',
    });
  });

  it('rejects weak registration passwords', async () => {
    await expect(
      fake.createEmailPasswordUser({
        email: 'owner@example.com',
        password: 'short',
        displayName: 'Owner Person',
      }),
    ).rejects.toMatchObject({
      code: 'auth/invalid-password',
    });
  });

  it('generates a deterministic password setup link', async () => {
    await expect(
      fake.generatePasswordSetupLink(
        'Invitee@Example.com',
        'http://localhost:5173/invites/accept?token=invite-token',
      ),
    ).resolves.toBe(
      'http://localhost:5173/invites/password-setup?mode=resetPassword&oobCode=fake-reset-invitee%40example.com&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Finvites%2Faccept%3Ftoken%3Dinvite-token',
    );
  });
});
