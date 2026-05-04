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

@Injectable()
export class GithubOauthStateService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(userId: string): Promise<CreatedGithubOauthState> {
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    await this.db.insert(githubOauthStates).values({
      userId,
      state,
      codeVerifier,
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
