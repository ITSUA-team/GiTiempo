import type { CookieOptions } from 'express';

export const GITHUB_ACCOUNT_SESSION_COOKIE = 'github_account_session';

export function githubAccountSessionCookieOptions(
  secure: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/auth/github',
    maxAge: 10 * 60 * 1000,
  };
}
