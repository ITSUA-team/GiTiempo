import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

const ALGORITHM: CipherGCMTypes = 'aes-256-gcm';
const VERSION = 'v1';

@Injectable()
export class GithubEncryptionService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  encrypt(value: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      VERSION,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  decrypt(envelope: string): string {
    const [version, ivPart, tagPart, ciphertextPart] = envelope.split(':');
    if (version !== VERSION || !ivPart || !tagPart || !ciphertextPart) {
      throw new Error('Invalid encrypted token envelope');
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      this.getKey(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, 'base64url')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }

  private getKey(): Buffer {
    const configured = this.config.get('ENCRYPTION_KEY', { infer: true });
    if (configured) {
      const key = Buffer.from(configured, 'base64');
      if (key.length === 32) return key;
      throw new ServiceUnavailableException(
        'GitHub integration is not configured',
      );
    }
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') {
      return Buffer.alloc(32, 1);
    }
    throw new ServiceUnavailableException(
      'GitHub integration is not configured',
    );
  }
}
