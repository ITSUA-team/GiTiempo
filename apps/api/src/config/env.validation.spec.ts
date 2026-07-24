import { describe, expect, it } from 'vitest';
import { validate } from './env.validation';

function makeBaseEnv(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/gitiempo',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    FIREBASE_PROJECT_ID: 'project-id',
    FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
    FIREBASE_PRIVATE_KEY:
      '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----',
    USER_SPA_URL: 'https://user.example.com',
    ADMIN_SPA_URL: 'https://admin.example.com',
    APP_URL: 'https://api.example.com',
    GITHUB_APP_ID: '1',
    GITHUB_APP_CLIENT_ID: 'client-id',
    GITHUB_APP_CLIENT_SECRET: 'client-secret',
    ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
    SMTP_HOST: 'smtp.example.com',
    INVITES_EMAIL_CONSOLE_FALLBACK: 'false',
    ...overrides,
  };
}

describe('validate', () => {
  it('requires SMTP_HOST in production even if console fallback is enabled', () => {
    expect(() =>
      validate(
        makeBaseEnv({
          NODE_ENV: 'production',
          SMTP_HOST: '',
          INVITES_EMAIL_CONSOLE_FALLBACK: 'true',
        }),
      ),
    ).toThrow(/SMTP_HOST/);
  });

  it('requires ADMIN_SPA_URL in production so admin sign-in cannot fall back to localhost', () => {
    expect(() =>
      validate(makeBaseEnv({ NODE_ENV: 'production', ADMIN_SPA_URL: '' })),
    ).toThrow(/ADMIN_SPA_URL/);
  });

  it('rejects invite console secret logging outside development', () => {
    expect(() =>
      validate(
        makeBaseEnv({
          NODE_ENV: 'test',
          INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS: 'true',
        }),
      ),
    ).toThrow(/INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS/);

    expect(() =>
      validate(
        makeBaseEnv({
          NODE_ENV: 'production',
          INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS: 'true',
        }),
      ),
    ).toThrow(/INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS/);
  });

  it('allows invite console secret logging in development only', () => {
    expect(
      validate(
        makeBaseEnv({
          NODE_ENV: 'development',
          INVITES_EMAIL_CONSOLE_FALLBACK: 'true',
          INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS: 'true',
          SMTP_HOST: '',
        }),
      ).INVITES_EMAIL_CONSOLE_FALLBACK_SHOW_SECRETS,
    ).toBe(true);
  });

  it('parses Chrome extension origins in the CORS allowlist', () => {
    expect(
      validate(
        makeBaseEnv({
          ALLOWED_ORIGINS:
            'https://app.example.com,chrome-extension://jecefpocaddielfbclbfgnepokjlabed',
        }),
      ).ALLOWED_ORIGINS,
    ).toEqual([
      'https://app.example.com',
      'chrome-extension://jecefpocaddielfbclbfgnepokjlabed',
    ]);
  });
});
