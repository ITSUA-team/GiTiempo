import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { projects } from '../../projects/schemas/projects.schema';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import { tasks } from './tasks.schema';

export const taskAssignees = pgTable(
  'task_assignees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('task_assignees_task_id_user_id_unique').on(
      table.taskId,
      table.userId,
    ),
    index('task_assignees_workspace_project_idx').on(
      table.workspaceId,
      table.projectId,
    ),
    index('task_assignees_user_id_idx').on(table.userId),
  ],
);
