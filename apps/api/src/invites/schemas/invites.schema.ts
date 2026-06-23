import { getTableColumns } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { WorkspaceRole } from '@gitiempo/shared';
import { users } from '../../users/schemas/users.schema';
import { workspaces } from '../../workspaces/schemas/workspaces.schema';

export const INVITE_STATUSES = ['pending', 'accepted', 'expired'] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const invites = pgTable(
  'invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: varchar('role', { length: 20 })
      .$type<WorkspaceRole>()
      .default('member')
      .notNull(),
    status: varchar('status', { length: 20 })
      .$type<InviteStatus>()
      .default('pending')
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('invites_token_unique').on(table.token),
    index('invites_workspace_id_idx').on(table.workspaceId),
    index('invites_email_status_idx').on(
      table.workspaceId,
      table.email,
      table.status,
    ),
  ],
);

export const inviteRowSelection = getTableColumns(invites);
