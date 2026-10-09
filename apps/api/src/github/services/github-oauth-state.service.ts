import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  githubOauthStates,
  type GithubOauthStateRow,
} from '../schemas/github-oauth-states.schema';

const STATE_TTL_MS = 10 * 60 * 1_000;

export interface CreatedGithubOauthState {
  state: string;
  codeChallenge: string;
}

export type GithubOauthProvider = 'github_app' | 'oauth_app';
export type GithubOauthPurpose = 'personal_data' | 'account_link';

export interface CreateGithubOauthStateInput {
  userId: string;
  provider?: GithubOauthProvider;
  purpose?: GithubOauthPurpose;
  sessionTokenHash?: string;
  generation?: number;
}

@Injectable()
export class GithubOauthStateService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(
    input: string | CreateGithubOauthStateInput,
  ): Promise<CreatedGithubOauthState> {
    const request = typeof input === 'string' ? { userId: input } : input;
    const rawState = randomBytes(32).toString('base64url');
    // Account-link states use their own opaque namespace so the public callback
    // can route them without ever falling through to sign-in or App handling.
    const state =
      request.purpose === 'account_link'
        ? `account_link.${rawState}`
        : rawState;
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    await this.db.insert(githubOauthStates).values({
      userId: request.userId,
      state,
      codeVerifier,
      provider: request.provider ?? 'github_app',
      purpose: request.purpose ?? 'personal_data',
      sessionTokenHash: request.sessionTokenHash ?? null,
      generation: request.generation ?? 0,
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });
    return { state, codeChallenge };
  }

  async claim(state: string): Promise<GithubOauthStateRow | null> {
    const [row] = await this.db
      .update(githubOauthStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(githubOauthStates.state, state),
          isNull(githubOauthStates.consumedAt),
          gt(githubOauthStates.expiresAt, new Date()),
        ),
      )
      .returning();
    return row ?? null;
  }
}
