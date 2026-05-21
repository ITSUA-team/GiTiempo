import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../db/db.constants';
import type { DrizzleDB } from '../../db/db.types';
import { refreshTokens } from '../schemas/refresh-tokens.schema';

export interface RotateIfActiveResult {
  newRow: RefreshTokenRow;
}

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;

export interface CreateRefreshTokenInput {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Data-access for `refresh_tokens`.
 *
 * Lookups by `token_hash` use the unique index (O(log n)) and never
 * SQL-interpolate the raw token; the caller is responsible for hashing.
 * The unique index makes hash lookups constant-time from the DB's
 * perspective — we never iterate rows to find a match.
 *
 * See design D1 and D2 in `add-firebase-jwt-auth`.
 */
@Injectable()
export class RefreshTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenRow> {
    const [row] = await this.db
      .insert(refreshTokens)
      .values({
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!row) throw new Error('Failed to insert refresh token');
    return row;
  }

  /**
   * Returns an active (non-revoked) row matching the hash, or null.
   * Expiry is enforced at the service layer where the reason matters.
   */
  async findActiveByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * Returns a row matching the hash regardless of `revoked_at`. Used by
   * reuse detection: a hit here with `revoked_at IS NOT NULL` means the
   * client is replaying an already-rotated token.
   */
  async findByHashIncludingRevoked(
    tokenHash: string,
  ): Promise<RefreshTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<RefreshTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, id))
      .limit(1);
    return row ?? null;
  }

  /**
   * Soft-revoke a row on rotation. Sets `revoked_at = now()` and links
   * the newly issued row via `replaced_by`.
   */
  async markRevoked(id: string, replacedById: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), replacedBy: replacedById })
      .where(eq(refreshTokens.id, id));
  }

  /**
   * Hard-delete every row in a family. Called on reuse detection and
   * (optionally) on explicit "logout everywhere" flows.
   */
  async deleteFamily(familyId: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.familyId, familyId));
  }

  /** Hard-delete a single row by id. Used by logout. */
  async deleteById(id: string): Promise<void> {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, id));
  }

  /**
   * Atomically rotate a refresh token inside a single transaction.
   *
   * Inserts a new row, then attempts a compare-and-set update on the
   * old row: `SET revoked_at = now(), replaced_by = <newId> WHERE
   * id = <oldId> AND revoked_at IS NULL`.  If another concurrent
   * refresh already revoked the old row the update matches 0 rows,
   * the transaction is rolled back, and `null` is returned.
   */
  async rotateIfActive(
    oldId: string,
    input: CreateRefreshTokenInput,
  ): Promise<RotateIfActiveResult | null> {
    return this.db.transaction(async (tx) => {
      const [newRow] = await tx
        .insert(refreshTokens)
        .values({
          userId: input.userId,
          familyId: input.familyId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        })
        .returning();
      if (!newRow) {
        tx.rollback();
        return null;
      }

      const [updated] = await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedBy: newRow.id })
        .where(
          and(eq(refreshTokens.id, oldId), isNull(refreshTokens.revokedAt)),
        )
        .returning();

      if (!updated) {
        tx.rollback();
        return null;
      }

      return { newRow };
    });
  }
}
