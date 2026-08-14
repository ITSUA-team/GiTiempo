import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import {
  jiraOauthStates,
  type JiraOauthStateRow,
} from '../schemas/jira-oauth-states.schema';

const STATE_TTL_MS = 10 * 60 * 1_000;

@Injectable()
export class JiraOauthStateService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(userId: string): Promise<{ state: string }> {
    const state = randomBytes(32).toString('base64url');
    await this.db.insert(jiraOauthStates).values({
      userId,
      state,
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });
    return { state };
  }

  async claim(state: string): Promise<JiraOauthStateRow | null> {
    const [row] = await this.db
      .update(jiraOauthStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(jiraOauthStates.state, state),
          isNull(jiraOauthStates.consumedAt),
          gt(jiraOauthStates.expiresAt, new Date()),
        ),
      )
      .returning();
    return row ?? null;
  }
}
