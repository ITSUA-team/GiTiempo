import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { TaskPriority, TaskStatus } from '@gitiempo/shared';
import { projects } from '../../projects/schemas/projects.schema';
import { users } from '../../users/schemas/users.schema';
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
    description: text('description'),
    priority: varchar('priority', { length: 20 })
      .$type<TaskPriority>()
      .default('medium')
      .notNull(),
    status: varchar('status', { length: 20 })
      .$type<TaskStatus>()
      .default('open')
      .notNull(),
    assigneeUserId: uuid('assignee_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
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
    index('tasks_assignee_user_id_idx').on(table.assigneeUserId),
    check(
      'tasks_priority_check',
      sql`${table.priority} IN ('low', 'medium', 'high')`,
    ),
  ],
);
