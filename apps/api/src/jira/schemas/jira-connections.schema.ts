import { getTableColumns } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { JiraSite } from '@gitiempo/shared';
import { sql } from 'drizzle-orm';
import { users } from '../../users/schemas/users.schema';

export const jiraConnections = pgTable(
  'jira_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    atlassianAccountId: varchar('atlassian_account_id', {
      length: 255,
    }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }),
    avatarUrl: text('avatar_url'),
    sites: jsonb('sites')
      .$type<JiraSite[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    connected: boolean('connected').default(true).notNull(),
    reauthorizationRequired: boolean('reauthorization_required')
      .default(false)
      .notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('jira_connections_user_id_unique').on(table.userId),
    index('jira_connections_atlassian_account_id_idx').on(
      table.atlassianAccountId,
    ),
  ],
);

export type JiraConnectionRow = typeof jiraConnections.$inferSelect;

export const jiraConnectionRowSelection = getTableColumns(jiraConnections);
