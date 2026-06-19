import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

/**
 * Refresh tokens table.
 *
 * Storage model (see design decisions D1–D2 of `add-firebase-jwt-auth`):
 * - Only the `sha256` hash of the opaque random token is persisted.
 * - `family_id` groups all tokens rotated from a single login; a reused
 *   (already revoked) token triggers a hard delete of the entire family.
 * - `replaced_by` is set on rotation so reuse detection can walk the chain.
 * - `revoked_at` soft-marks a row as "spent" while still allowing reuse
 *   detection until the family is hard-deleted.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    replacedBy: uuid('replaced_by').references(
      (): AnyPgColumn => refreshTokens.id,
      { onDelete: 'set null' },
    ),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  ],
);

export const refreshTokenRowSelection = {
  id: refreshTokens.id,
  userId: refreshTokens.userId,
  familyId: refreshTokens.familyId,
  tokenHash: refreshTokens.tokenHash,
  replacedBy: refreshTokens.replacedBy,
  revokedAt: refreshTokens.revokedAt,
  expiresAt: refreshTokens.expiresAt,
  createdAt: refreshTokens.createdAt,
};
