import { getTableColumns, sql } from 'drizzle-orm';
import {
  check,
  integer,
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
    timeZone: varchar('time_zone', { length: 64 }).default('UTC').notNull(),
    timeRoundingStepMinutes: integer('time_rounding_step_minutes')
      .default(1)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('workspace_settings_workspace_id_unique').on(table.workspaceId),
    check(
      'workspace_settings_time_rounding_step_minutes_check',
      sql`${table.timeRoundingStepMinutes} >= 1 AND ${table.timeRoundingStepMinutes} <= 60`,
    ),
  ],
);

export const workspaceSettingsRowSelection = getTableColumns(workspaceSettings);
