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
});
