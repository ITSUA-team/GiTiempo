import {
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { ProjectVisibility } from '@gitiempo/shared';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 7 }),
    visibility: varchar('visibility', { length: 20 })
      .$type<ProjectVisibility>()
      .default('private')
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
  ],
);
