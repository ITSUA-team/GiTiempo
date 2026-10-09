import { getTableColumns } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

/** Survives unlink/relink so pre-disconnect asynchronous work cannot commit. */
export const githubAuthorizationGenerations = pgTable(
  'github_authorization_generations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    generation: integer('generation').notNull().default(0),
    disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_authorization_generations_user_id_unique').on(
      table.userId,
    ),
  ],
);

export type GithubAuthorizationGenerationRow =
  typeof githubAuthorizationGenerations.$inferSelect;
export const githubAuthorizationGenerationRowSelection = getTableColumns(
  githubAuthorizationGenerations,
);
