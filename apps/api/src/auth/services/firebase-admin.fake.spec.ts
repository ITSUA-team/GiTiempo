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
      signInProvider: 'password',
    });
  });

  it('includes the optional name segment', async () => {
    const decoded = await fake.verifyIdToken('test:u1:alice@example.com:Alice');
    expect(decoded.name).toBe('Alice');
    expect(decoded.uid).toBe('u1');
    expect(decoded.email).toBe('alice@example.com');
  });

  it('includes the optional picture segment, keeping its scheme colon', async () => {
    const decoded = await fake.verifyIdToken(
      'test:u1:alice@example.com:Alice:https://cdn.example.com/a.png',
    );
    expect(decoded.picture).toBe('https://cdn.example.com/a.png');
    expect(decoded.name).toBe('Alice');
  });

  it('omits the picture when the token carries no fifth segment', async () => {
    const decoded = await fake.verifyIdToken('test:u1:alice@example.com:Alice');
    expect(decoded.picture).toBeUndefined();
  });

  it('accepts trusted provider and verification test controls', async () => {
    await expect(
      fake.verifyIdToken(
        'test:u1:alice@example.com:Alice:provider=google.com:verified=false',
      ),
    ).resolves.toMatchObject({
      signInProvider: 'google.com',
      email_verified: false,
    });
  });

  it('rejects a previously verified identity after registration compensation deletes it', async () => {
    const user = await fake.createEmailPasswordUser({
      uid: 'registration-rollback-uid',
      email: 'rollback@example.com',
      password: 'long-enough-password',
      displayName: 'Rollback',
    });
    await fake.verifyIdToken(
      `test:${user.uid}:${user.email}:provider=google.com`,
    );
    await fake.deleteUser(user.uid);

    await expect(
      fake.assertActiveUserByUid(user.uid, user.email),
    ).rejects.toBeInstanceOf(UnauthorizedException);
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

  it('records verified observed identities, but creates manual identities as unverified', async () => {
    await fake.verifyIdToken(
      'test:google-uid:owner@example.com:provider=google.com',
    );
    const manual = await fake.createEmailPasswordUser({
      uid: 'password-uid',
      email: 'password@example.com',
      password: 'long-enough-password',
      displayName: 'Password owner',
    });
    await fake.createUnclaimedUser({
      uid: 'unclaimed-uid',
      email: 'invitee@example.com',
    });

    await expect(fake.getUserByUid('google-uid')).resolves.toEqual({
      uid: 'google-uid',
      email: 'owner@example.com',
      emailVerified: true,
      disabled: false,
    });
    await expect(fake.getUserByUid(manual.uid)).resolves.toMatchObject({
      emailVerified: false,
    });
    await expect(fake.getUserByUid('unclaimed-uid')).resolves.toMatchObject({
      emailVerified: false,
    });
    await expect(fake.getUserByUid('unknown-uid')).resolves.toBeNull();
  });

  it('rejects disabled and deleted identities', async () => {
    const user = await fake.createEmailPasswordUser({
      uid: 'disabled-user',
      email: 'disabled@example.com',
      password: 'long-enough-password',
      displayName: 'Disabled owner',
    });
    fake.setUserDisabled(user.uid, true);

    await expect(
      fake.assertActiveUserByUid(user.uid, user.email),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await fake.deleteUser(user.uid);
    await expect(fake.getUserByUid(user.uid)).resolves.toBeNull();

    await fake.verifyIdToken(`test:${user.uid}:${user.email}`);
    await expect(fake.getUserByUid(user.uid)).resolves.toBeNull();
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

    expect(created).toMatchObject({
      uid: expect.stringMatching(/^fake-firebase-user-[a-f0-9]{16}$/),
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

  it('models password and Google credentials as usable alternative sign-in methods', async () => {
    await expect(fake.hasUsableAlternativeLogin('unknown-user')).resolves.toBe(
      true,
    );
    fake.setAlternativeProviders('user-1', ['google.com']);
    await expect(fake.hasUsableAlternativeLogin('user-1')).resolves.toBe(true);
    fake.setAlternativeProviders('user-1', []);
    await expect(fake.hasUsableAlternativeLogin('user-1')).resolves.toBe(false);
  });
});
