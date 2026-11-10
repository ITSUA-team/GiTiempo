import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { getTableColumns, sql } from 'drizzle-orm';
import type { ProjectVisibility } from '@gitiempo/shared';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const projectTrackingModes = ['managed', 'external-reference'] as const;
export type ProjectTrackingMode = (typeof projectTrackingModes)[number];

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }),
    visibility: varchar('visibility', { length: 20 })
      .$type<ProjectVisibility>()
      .default('private')
      .notNull(),
    trackingMode: varchar('tracking_mode', { length: 32 })
      .$type<ProjectTrackingMode>()
      .default('managed')
      .notNull(),
    defaultBillableForTasks: boolean('default_task_billable')
      .default(true)
      .notNull(),
    timeRoundingStepMinutes: integer('time_rounding_step_minutes'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('projects_workspace_id_idx').on(table.workspaceId),
    index('projects_workspace_id_active_idx').on(
      table.workspaceId,
      table.isActive,
    ),
    index('projects_workspace_active_visibility_idx').on(
      table.workspaceId,
      table.isActive,
      table.visibility,
    ),
    check(
      'projects_visibility_check',
      sql`${table.visibility} IN ('public', 'private')`,
    ),
    check(
      'projects_tracking_mode_check',
      sql`${table.trackingMode} IN ('managed', 'external-reference')`,
    ),
    check(
      'projects_time_rounding_step_minutes_check',
      sql`${table.timeRoundingStepMinutes} IS NULL OR (${table.timeRoundingStepMinutes} >= 1 AND ${table.timeRoundingStepMinutes} <= 60)`,
    ),
  ],
);

export const projectRowSelection = getTableColumns(projects);
