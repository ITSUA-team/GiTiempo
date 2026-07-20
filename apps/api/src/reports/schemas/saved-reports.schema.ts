import { getTableColumns, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { SavedReportConfig } from '@gitiempo/shared';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

/**
 * Named report presets, shared across a workspace.
 *
 * `config` is one JSON column rather than a column per filter: it snapshots the
 * reports page view, whose shape changes whenever the page gains a filter. It
 * is written and read only through the shared Zod schema, which validates known
 * keys strictly and tolerates missing ones, so a preset saved before a filter
 * existed keeps loading.
 *
 * `created_by` is attribution only — any admin or PM in the workspace may edit
 * or delete any preset.
 */
export const savedReports = pgTable(
  'saved_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 120 }).notNull(),
    config: jsonb('config').$type<SavedReportConfig>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('saved_reports_workspace_id_idx').on(table.workspaceId),
    // Names identify a preset to the whole workspace, so they collide on case
    // and surrounding whitespace, matching the users email-lookup pattern.
    uniqueIndex('saved_reports_workspace_name_unique').on(
      table.workspaceId,
      sql`lower(btrim(${table.name}))`,
    ),
  ],
);

export const savedReportRowSelection = getTableColumns(savedReports);
