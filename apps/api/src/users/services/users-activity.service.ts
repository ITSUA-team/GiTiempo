import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { users } from '../schemas/users.schema';

@Injectable()
export class UsersActivityService {
  private readonly logger = new Logger(UsersActivityService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Bump `users.last_active_at` to now for the given user.
   * Errors are caught and logged — callers should fire-and-forget.
   */
  async touchLastActive(userId: string): Promise<void> {
    try {
      await this.db
        .update(users)
        .set({ lastActiveAt: sql`now()` })
        .where(eq(users.id, userId));
    } catch (error) {
      this.logger.warn(
        `Failed to update last_active_at for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
