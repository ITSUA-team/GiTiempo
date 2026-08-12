import { getTableColumns, sql } from 'drizzle-orm';
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export type UserAvatarSource = 'provider' | 'user';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    avatarSource: varchar('avatar_source', { length: 20 })
      .$type<UserAvatarSource>()
      .default('provider')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_email_lookup_unique').on(
      sql`lower(btrim(${table.email}))`,
    ),
    check(
      'users_avatar_source_check',
      sql`${table.avatarSource} IN ('provider', 'user')`,
    ),
  ],
);

export const userRowSelection = getTableColumns(users);
