import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

export const jiraOauthStates = pgTable(
  'jira_oauth_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    state: varchar('state', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('jira_oauth_states_state_unique').on(table.state),
    index('jira_oauth_states_user_id_idx').on(table.userId),
    index('jira_oauth_states_expires_at_idx').on(table.expiresAt),
  ],
);

export type JiraOauthStateRow = typeof jiraOauthStates.$inferSelect;
