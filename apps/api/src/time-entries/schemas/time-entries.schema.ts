import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { TimeEntrySource } from '@gitiempo/shared';
import { tasks } from '../../tasks/schemas/tasks.schema';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    description: text('description'),
    isBillable: boolean('is_billable').default(true).notNull(),
    source: varchar('source', { length: 20 })
      .$type<TimeEntrySource>()
      .default('web')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('time_entries_task_id_idx').on(table.taskId),
    index('time_entries_user_id_idx').on(table.userId),
    index('time_entries_workspace_id_idx').on(table.workspaceId),
    index('time_entries_started_at_idx').on(table.startedAt),
    index('time_entries_date_range_idx').on(
      table.workspaceId,
      table.userId,
      table.startedAt,
      table.endedAt,
    ),
    uniqueIndex('time_entries_running_unique')
      .on(table.userId)
      .where(sql`${table.endedAt} IS NULL`),
    check(
      'time_entries_duration_state_check',
      sql`(
        (${table.endedAt} IS NULL AND ${table.durationSeconds} IS NULL)
        OR
        (
          ${table.endedAt} IS NOT NULL
          AND ${table.endedAt} > ${table.startedAt}
          AND ${table.durationSeconds} IS NOT NULL
          AND ${table.durationSeconds} > 0
        )
      )`,
    ),
    check(
      'time_entries_source_check',
      sql`${table.source} IN ('web', 'extension', 'manual')`,
    ),
  ],
);

export const timeEntryRowSelection = {
  id: timeEntries.id,
  taskId: timeEntries.taskId,
  userId: timeEntries.userId,
  workspaceId: timeEntries.workspaceId,
  startedAt: timeEntries.startedAt,
  endedAt: timeEntries.endedAt,
  durationSeconds: timeEntries.durationSeconds,
  description: timeEntries.description,
  isBillable: timeEntries.isBillable,
  source: timeEntries.source,
  createdAt: timeEntries.createdAt,
  updatedAt: timeEntries.updatedAt,
};
