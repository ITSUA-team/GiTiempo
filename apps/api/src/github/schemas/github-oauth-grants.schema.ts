import { getTableColumns } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { githubAccountLinks } from './github-account-links.schema';

/** OAuth App credentials used for identity and organization discovery only. */
export const githubOauthGrants = pgTable(
  'github_oauth_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountLinkId: uuid('account_link_id')
      .notNull()
      .references(() => githubAccountLinks.id, { onDelete: 'cascade' }),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    scopes: text('scopes').array().notNull().default([]),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    authorizedAt: timestamp('authorized_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_oauth_grants_account_link_id_unique').on(
      table.accountLinkId,
    ),
    index('github_oauth_grants_expires_at_idx').on(table.tokenExpiresAt),
  ],
);

export type GithubOauthGrantRow = typeof githubOauthGrants.$inferSelect;
export const githubOauthGrantRowSelection = getTableColumns(githubOauthGrants);
