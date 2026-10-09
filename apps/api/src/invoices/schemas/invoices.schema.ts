import { getTableColumns, sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { InvoiceStatus } from '@gitiempo/shared';
import { projects } from '../../projects/schemas/projects.schema';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 })
      .$type<InvoiceStatus>()
      .default('draft')
      .notNull(),
    dateFrom: date('date_from').notNull(),
    dateTo: date('date_to').notNull(),
    hourlyRate: numeric('hourly_rate', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    discountPercent: numeric('discount_percent', {
      precision: 5,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    totalHours: numeric('total_hours', {
      precision: 10,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    totalAmount: numeric('total_amount', {
      precision: 12,
      scale: 2,
      mode: 'number',
    })
      .default(0)
      .notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('invoices_workspace_id_idx').on(table.workspaceId),
    index('invoices_workspace_project_idx').on(
      table.workspaceId,
      table.projectId,
    ),
    index('invoices_workspace_status_idx').on(table.workspaceId, table.status),
    check(
      'invoices_status_check',
      sql`${table.status} IN ('draft', 'sent', 'paid')`,
    ),
    check(
      'invoices_discount_check',
      sql`${table.discountPercent} >= 0 AND ${table.discountPercent} <= 100`,
    ),
    check(
      'invoices_date_range_check',
      sql`${table.dateTo} >= ${table.dateFrom}`,
    ),
  ],
);

export const invoiceRowSelection = getTableColumns(invoices);
