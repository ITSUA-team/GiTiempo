import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const workspaceGitHubOrganizations = pgTable(
  'workspace_github_organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    organizationLogin: varchar('organization_login', { length: 255 }).notNull(),
    normalizedLogin: varchar('normalized_login', { length: 255 }).notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('workspace_github_organizations_workspace_id_idx').on(
      table.workspaceId,
    ),
    uniqueIndex(
      'workspace_github_organizations_workspace_id_normalized_login_unique',
    ).on(table.workspaceId, table.normalizedLogin),
  ],
);

export const workspaceGitHubOrganizationRowSelection = {
  id: workspaceGitHubOrganizations.id,
  workspaceId: workspaceGitHubOrganizations.workspaceId,
  organizationLogin: workspaceGitHubOrganizations.organizationLogin,
  normalizedLogin: workspaceGitHubOrganizations.normalizedLogin,
  createdByUserId: workspaceGitHubOrganizations.createdByUserId,
  createdAt: workspaceGitHubOrganizations.createdAt,
  updatedAt: workspaceGitHubOrganizations.updatedAt,
};
