import {
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.schema';

export const workspaceSettings = pgTable(
  'workspace_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),
    defaultHourlyRate: numeric('default_hourly_rate', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('workspace_settings_workspace_id_unique').on(table.workspaceId),
  ],
);
