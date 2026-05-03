import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

export const githubConnections = pgTable(
  'github_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    githubUserId: varchar('github_user_id', { length: 255 }).notNull(),
    login: varchar('login', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    connected: boolean('connected').default(true).notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_connections_user_id_unique').on(table.userId),
    index('github_connections_github_user_id_idx').on(table.githubUserId),
  ],
);

export type GithubConnectionRow = typeof githubConnections.$inferSelect;
