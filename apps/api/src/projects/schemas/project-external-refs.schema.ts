import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import { projects } from './projects.schema';

export const projectExternalRefs = pgTable(
  'project_external_refs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    externalType: varchar('external_type', { length: 50 }).notNull(),
    externalId: varchar('external_id', { length: 255 }),
    externalKey: varchar('external_key', { length: 500 }).notNull(),
    externalUrl: text('external_url'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('project_external_refs_project_id_idx').on(table.projectId),
    uniqueIndex('project_external_refs_workspace_provider_key_unique').on(
      table.workspaceId,
      table.provider,
      table.externalType,
      table.externalKey,
    ),
    index('project_external_refs_workspace_provider_id_idx')
      .on(
        table.workspaceId,
        table.provider,
        table.externalType,
        table.externalId,
      )
      .where(sql`${table.externalId} IS NOT NULL`),
  ],
);
