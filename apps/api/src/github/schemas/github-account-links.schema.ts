import { getTableColumns } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

/**
 * Stable ownership of a GitHub account. Credentials intentionally live in
 * separate tables so a missing or revoked grant never changes ownership.
 */
export const githubAccountLinks = pgTable(
  'github_account_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    githubUserId: varchar('github_user_id', { length: 255 }).notNull(),
    login: varchar('login', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_account_links_user_id_unique').on(table.userId),
    uniqueIndex('github_account_links_github_user_id_unique').on(
      table.githubUserId,
    ),
    index('github_account_links_login_idx').on(table.login),
  ],
);

export type GithubAccountLinkRow = typeof githubAccountLinks.$inferSelect;
export const githubAccountLinkRowSelection =
  getTableColumns(githubAccountLinks);
