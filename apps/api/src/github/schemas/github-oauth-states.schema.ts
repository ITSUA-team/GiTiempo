import {
  index,
  pgTable,
  text,
  timestamp,
  integer,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

export const githubOauthStates = pgTable(
  'github_oauth_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    state: varchar('state', { length: 128 }).notNull(),
    codeVerifier: text('code_verifier').notNull(),
    provider: varchar('provider', { length: 32 })
      .notNull()
      .default('github_app'),
    purpose: varchar('purpose', { length: 64 })
      .notNull()
      .default('personal_data'),
    /** SHA-256 of the encrypted HttpOnly session cookie value; never raw JWT. */
    sessionTokenHash: varchar('session_token_hash', { length: 64 }),
    generation: integer('generation').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_oauth_states_state_unique').on(table.state),
    index('github_oauth_states_user_id_idx').on(table.userId),
    index('github_oauth_states_expires_at_idx').on(table.expiresAt),
    index('github_oauth_states_account_link_idx').on(
      table.userId,
      table.purpose,
      table.expiresAt,
    ),
  ],
);

export type GithubOauthStateRow = typeof githubOauthStates.$inferSelect;
