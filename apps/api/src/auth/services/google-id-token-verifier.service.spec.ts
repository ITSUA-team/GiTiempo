import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleIdTokenVerifier } from './google-id-token-verifier.service';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const publicJwk = publicKey.export({ format: 'jwk' });
const clientId = 'client-id.apps.googleusercontent.com';

function jwks(kid = 'kid-1') {
  return {
    keys: [{ ...publicJwk, kid, use: 'sig', alg: 'RS256' }],
  };
}

function idToken(overrides: Record<string, unknown> = {}, options = {}) {
  const now = Math.floor(Date.now() / 1_000);
  return jwt.sign(
    {
      sub: 'google-subject',
      email: 'User@Example.test',
      email_verified: true,
      aud: clientId,
      iss: 'https://accounts.google.com',
      iat: now,
      exp: now + 600,
      ...overrides,
    },
    privateKey,
    { algorithm: 'RS256', keyid: 'kid-1', ...options },
  );
}

describe('GoogleIdTokenVerifier', () => {
  let verifier: GoogleIdTokenVerifier;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(jwks()), {
        headers: { 'cache-control': 'max-age=3600' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    verifier = new GoogleIdTokenVerifier({
      get: vi.fn().mockReturnValue([clientId]),
    } as never);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('verifies a signed Google proof and normalizes its email', async () => {
    await expect(verifier.verify(idToken())).resolves.toEqual({
      subject: 'google-subject',
      email: 'user@example.test',
    });
  });

  it('accepts an authorized party configured as a Google client ID', async () => {
    await expect(verifier.verify(idToken({ azp: clientId }))).resolves.toEqual({
      subject: 'google-subject',
      email: 'user@example.test',
    });
  });

  it.each([
    ['wrong issuer', { iss: 'https://attacker.example' }],
    ['wrong audience', { aud: 'other-client' }],
    ['unknown azp', { azp: 'other-client' }],
    ['unverified email', { email_verified: false }],
    ['missing email', { email: '' }],
    ['missing subject', { sub: '' }],
    ['future iat', { iat: Math.floor(Date.now() / 1_000) + 120 }],
    ['expired', { exp: Math.floor(Date.now() / 1_000) - 1 }],
  ])('rejects %s', async (_name, claims) => {
    await expect(verifier.verify(idToken(claims))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects forged signatures and non-RS256 headers', async () => {
    const forged = jwt.sign({ sub: 'google-subject' }, 'attacker', {
      algorithm: 'HS256',
      keyid: 'kid-1',
    });
    await expect(verifier.verify(forged)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const [header, payload, signature] = idToken().split('.');
    const signatureBytes = Buffer.from(signature, 'base64url');
    signatureBytes[0] ^= 1;
    const altered = [
      header,
      payload,
      signatureBytes.toString('base64url'),
    ].join('.');
    await expect(verifier.verify(altered)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token without an issued-at claim', async () => {
    const now = Math.floor(Date.now() / 1_000);
    const withoutIat = jwt.sign(
      {
        sub: 'google-subject',
        email: 'user@example.test',
        email_verified: true,
        aud: clientId,
        iss: 'https://accounts.google.com',
        exp: now + 600,
      },
      privateKey,
      { algorithm: 'RS256', keyid: 'kid-1', noTimestamp: true },
    );
    await expect(verifier.verify(withoutIat)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    ['malformed body', { keys: {} }],
    ['null body', null],
    ['null key', { keys: [null] }],
    ['empty keys', { keys: [] }],
  ])('fails closed for a %s JWKS response', async (_name, body) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body)));
    await expect(verifier.verify(idToken())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('fails closed when JWKS is unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(verifier.verify(idToken())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('caches keys, coalesces concurrent loads, and refreshes an unknown rotated kid once', async () => {
    await Promise.all([verifier.verify(idToken()), verifier.verify(idToken())]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(jwks('kid-2')), {
        headers: { 'cache-control': 'max-age=3600' },
      }),
    );
    const rotated = jwt.sign(
      {
        sub: 'google-subject',
        email: 'user@example.test',
        email_verified: true,
        aud: clientId,
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1_000) + 600,
      },
      privateKey,
      { algorithm: 'RS256', keyid: 'kid-2' },
    );
    await expect(verifier.verify(rotated)).resolves.toMatchObject({
      subject: 'google-subject',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cools down distinct unknown key IDs after one refresh', async () => {
    const unknown = jwt.sign(
      {
        sub: 'google-subject',
        email: 'user@example.test',
        email_verified: true,
        aud: clientId,
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1_000) + 600,
      },
      privateKey,
      { algorithm: 'RS256', keyid: 'unknown-kid' },
    );
    await expect(verifier.verify(unknown)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const callsAfterFirstAttempt = fetchMock.mock.calls.length;
    const anotherUnknown = jwt.sign(
      {
        sub: 'google-subject',
        email: 'user@example.test',
        email_verified: true,
        aud: clientId,
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1_000) + 600,
      },
      privateKey,
      { algorithm: 'RS256', keyid: 'another-unknown-kid' },
    );
    await expect(verifier.verify(anotherUnknown)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterFirstAttempt);
  });

  it('fails closed when no configured client ID exists', async () => {
    verifier = new GoogleIdTokenVerifier({
      get: vi.fn().mockReturnValue([]),
    } as never);
    await expect(verifier.verify(idToken())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is instantiated by Nest with the runtime ConfigService token', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [() => ({ GOOGLE_OAUTH_CLIENT_IDS: [clientId] })],
        }),
      ],
      providers: [GoogleIdTokenVerifier],
    }).compile();

    expect(module.get(GoogleIdTokenVerifier)).toBeInstanceOf(
      GoogleIdTokenVerifier,
    );
    await module.close();
  });
});
