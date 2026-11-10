import { getTableColumns } from 'drizzle-orm';
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

/** Additional verified Firebase subjects belonging to a local account. */
export const firebaseSubjectBindings = pgTable(
  'firebase_subject_bindings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: varchar('provider_id', { length: 64 }).notNull(),
    verifiedEmail: varchar('verified_email', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('firebase_subject_bindings_uid_unique').on(table.firebaseUid),
    index('firebase_subject_bindings_user_id_idx').on(table.userId),
  ],
);

export const firebaseSubjectBindingRowSelection = getTableColumns(
  firebaseSubjectBindings,
);
