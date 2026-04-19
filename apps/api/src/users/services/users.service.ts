import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { UserResponse, UpdateUserInput } from '@gitiempo/shared';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { users } from '../schemas/users.schema';

type UserRow = typeof users.$inferSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Returns the "current" user.
   *
   * NOTE: authentication is not wired yet. Until it is, "me" is defined
   * as the first user from the seed, sorted by email ascending. This
   * gives us a deterministic identity for development and contract tests.
   */
  async findCurrent(): Promise<UserResponse> {
    const [row] = await this.db
      .select()
      .from(users)
      .orderBy(asc(users.email))
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        'No users found. Run `pnpm --filter @gitiempo/api db:seed` first.',
      );
    }

    return this.toResponse(row);
  }

  /**
   * Patches the "current" user. Same identity rule as `findCurrent`.
   *
   * `displayName` and `avatarUrl` are both optional but the schema
   * guarantees at least one of them is present (validated upstream).
   */
  async updateCurrent(input: UpdateUserInput): Promise<UserResponse> {
    const current = await this.findCurrent();

    const [updated] = await this.db
      .update(users)
      .set({
        ...(input.displayName !== undefined
          ? { displayName: input.displayName }
          : {}),
        ...(input.avatarUrl !== undefined
          ? { avatarUrl: input.avatarUrl }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.id))
      .returning();

    if (!updated) {
      // Extremely unlikely (we just read the row) but keep the contract honest.
      throw new NotFoundException('User disappeared during update');
    }

    this.logger.log(`Updated user ${updated.id}`);
    return this.toResponse(updated);
  }

  /** Maps a DB row to the public response shape (drops `firebaseUid`). */
  private toResponse(row: UserRow): UserResponse {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
