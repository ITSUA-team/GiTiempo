import { getTableColumns } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { TaskStatus } from '@gitiempo/shared';
import { projects } from '../../projects/schemas/projects.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: varchar('status', { length: 20 })
      .$type<TaskStatus>()
      .default('open')
      .notNull(),
    defaultBillableForTimeEntries: boolean('default_time_entry_billable')
      .default(true)
      .notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('tasks_project_id_idx').on(table.projectId),
    index('tasks_workspace_id_idx').on(table.workspaceId),
    index('tasks_workspace_project_active_idx').on(
      table.workspaceId,
      table.projectId,
      table.isActive,
    ),
  ],
);

export const taskRowSelection = getTableColumns(tasks);
