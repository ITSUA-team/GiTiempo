import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  unique,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';
import { users } from '../../users/schemas/users.schema';
import { invoices } from './invoices.schema';
export const invoiceGroups = pgTable(
  'invoice_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
  },
  (t) => [
    unique('invoice_group_owner_key').on(t.id, t.workspaceId, t.ownerId),
    uniqueIndex('invoice_group_name_key').on(
      t.workspaceId,
      t.ownerId,
      sql`lower(trim(${t.name}))`,
    ),
  ],
);
export const invoiceGroupMemberships = pgTable(
  'invoice_group_memberships',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.invoiceId, t.workspaceId],
      foreignColumns: [invoices.id, invoices.workspaceId],
    }).onDelete('cascade'),
    unique('invoice_group_single_membership').on(
      t.workspaceId,
      t.ownerId,
      t.invoiceId,
    ),
    foreignKey({
      columns: [t.groupId, t.workspaceId, t.ownerId],
      foreignColumns: [
        invoiceGroups.id,
        invoiceGroups.workspaceId,
        invoiceGroups.ownerId,
      ],
    }).onDelete('cascade'),
  ],
);
