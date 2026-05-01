import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Env } from '../../config/env.validation';
import { GithubEncryptionService } from './github-encryption.service';

const key = Buffer.alloc(32, 7).toString('base64');

function service(overrides: Partial<Env> = {}) {
  const config = {
    ENCRYPTION_KEY: key,
    NODE_ENV: 'test',
    ...overrides,
  } as Record<string, unknown>;
  return new GithubEncryptionService({
    get: (name: string) => config[name],
  } as unknown as ConfigService<Env, true>);
}

describe('GithubEncryptionService', () => {
  it('round-trips encrypted values without storing plaintext', () => {
    const encrypted = service().encrypt('ghu_secret');
    expect(encrypted).not.toContain('ghu_secret');
    expect(service().decrypt(encrypted)).toBe('ghu_secret');
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = service().encrypt('ghu_secret');
    const parts = encrypted.split(':');
    parts[3] = Buffer.from('tampered').toString('base64url');
    const tampered = parts.join(':');
    expect(() => service().decrypt(tampered)).toThrow();
  });

  it('rejects wrong keys', () => {
    const encrypted = service().encrypt('ghu_secret');
    const other = service({
      ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'),
    });
    expect(() => other.decrypt(encrypted)).toThrow();
  });

  it('uses deterministic key only in test mode', () => {
    const encrypted = service({ ENCRYPTION_KEY: undefined }).encrypt(
      'ghu_secret',
    );
    expect(service({ ENCRYPTION_KEY: undefined }).decrypt(encrypted)).toBe(
      'ghu_secret',
    );
    expect(() =>
      service({ ENCRYPTION_KEY: undefined, NODE_ENV: 'development' }).encrypt(
        'ghu_secret',
      ),
    ).toThrow(ServiceUnavailableException);
  });
});
