import { getTableColumns } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const workspaceGitHubInstallations = pgTable(
  'workspace_github_installations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    organizationId: varchar('organization_id', { length: 30 }).notNull(),
    organizationLogin: varchar('organization_login', { length: 255 }).notNull(),
    normalizedOrganizationLogin: varchar('normalized_organization_login', {
      length: 255,
    }).notNull(),
    installationId: varchar('installation_id', { length: 30 }).notNull(),
    appId: varchar('app_id', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 })
      .$type<'verified' | 'suspended' | 'unavailable' | 'disconnected'>()
      .notNull(),
    authorizationVersion: integer('authorization_version').default(1).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id),
    recoveryReason: varchar('recovery_reason', { length: 500 }),
    disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex(
      'workspace_github_installations_workspace_organization_unique',
    ).on(table.workspaceId, table.organizationId),
    index('workspace_github_installations_installation_id_idx').on(
      table.installationId,
    ),
    index('workspace_github_installations_workspace_status_idx').on(
      table.workspaceId,
      table.status,
    ),
  ],
);

export const githubInstallationSetupStates = pgTable(
  'github_installation_setup_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    state: varchar('state', { length: 256 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    organizationId: varchar('organization_id', { length: 30 }).notNull(),
    organizationLogin: varchar('organization_login', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_installation_setup_states_state_unique').on(
      table.state,
    ),
    index('github_installation_setup_states_expiry_idx').on(table.expiresAt),
    index('github_installation_setup_states_user_workspace_idx').on(
      table.userId,
      table.workspaceId,
    ),
  ],
);

export const githubInstallationWebhookDeliveries = pgTable(
  'github_installation_webhook_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deliveryId: varchar('delivery_id', { length: 255 }).notNull(),
    event: varchar('event', { length: 100 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('github_installation_webhook_deliveries_delivery_id_unique').on(
      table.deliveryId,
    ),
  ],
);

export const workspaceGitHubInstallationRowSelection = getTableColumns(
  workspaceGitHubInstallations,
);
export type WorkspaceGithubInstallationRow =
  typeof workspaceGitHubInstallations.$inferSelect;
export type GithubInstallationSetupStateRow =
  typeof githubInstallationSetupStates.$inferSelect;
