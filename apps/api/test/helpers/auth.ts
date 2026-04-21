import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

/**
 * Default seeded user used by e2e suites. Matches `apps/api/src/db/seed.ts`.
 * The fake Firebase provider accepts `test:<uid>:<email>[:<name>]` tokens.
 */
export const ADMIN_FAKE_TOKEN = 'test:admin-uid:admin@example.com:Admin';
export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_UID = 'admin-uid';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

/**
 * Exchange a fake Firebase ID token for a live (access, refresh) pair via
 * the running Nest app. Centralized so e2e specs do not duplicate the
 * happy-path login call.
 */
export async function login(
  app: INestApplication,
  firebaseIdToken: string = ADMIN_FAKE_TOKEN,
): Promise<IssuedTokens> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ firebaseIdToken });
  if (res.status !== 200) {
    throw new Error(
      `login() expected 200, got ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }
  return res.body as IssuedTokens;
}

/** Small helper so specs can say `bearer(token)` instead of building the header string. */
export function bearer(accessToken: string): string {
  return `Bearer ${accessToken}`;
}
