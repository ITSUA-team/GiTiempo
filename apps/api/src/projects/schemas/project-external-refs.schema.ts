import { getTableColumns, sql } from 'drizzle-orm';
import {
  check,
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

export const referenceProvenances = [
  'provider-verified',
  'user-supplied',
] as const;
export type ReferenceProvenance = (typeof referenceProvenances)[number];

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
    referenceProvenance: varchar('reference_provenance', { length: 32 })
      .$type<ReferenceProvenance>()
      .default('provider-verified')
      .notNull(),
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
    uniqueIndex(
      'project_external_refs_workspace_provider_repository_key_ci_unique',
    )
      .on(table.workspaceId, table.provider, sql`lower(${table.externalKey})`)
      .where(
        sql`${table.provider} = 'github' AND ${table.externalType} = 'repository'`,
      ),
    check(
      'project_external_refs_provenance_check',
      sql`${table.referenceProvenance} IN ('provider-verified', 'user-supplied')`,
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

export const projectExternalRefRowSelection =
  getTableColumns(projectExternalRefs);
