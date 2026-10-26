import { getTableColumns, sql } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/schemas/users.schema';

export const FIREBASE_IDENTITY_RESERVATION_PURPOSES = [
  'github-signin',
  'invitation',
  'registration',
] as const;
export type FirebaseIdentityReservationPurpose =
  (typeof FIREBASE_IDENTITY_RESERVATION_PURPOSES)[number];

export const FIREBASE_IDENTITY_RESERVATION_STATES = [
  'reserved',
  'confirmed',
  'bound',
] as const;
export type FirebaseIdentityReservationState =
  (typeof FIREBASE_IDENTITY_RESERVATION_STATES)[number];

/** App-owned evidence that an otherwise unbound Firebase UID can be retried safely. */
export const firebaseIdentityReservations = pgTable(
  'firebase_identity_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    normalizedEmail: varchar('normalized_email', { length: 255 }).notNull(),
    firebaseUid: varchar('firebase_uid', { length: 128 }).notNull(),
    purpose: varchar('purpose', { length: 32 })
      .$type<FirebaseIdentityReservationPurpose>()
      .notNull(),
    state: varchar('state', { length: 16 })
      .$type<FirebaseIdentityReservationState>()
      .default('reserved')
      .notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    registrationDisplayName: varchar('registration_display_name', {
      length: 255,
    }),
    registrationWorkspaceName: varchar('registration_workspace_name', {
      length: 255,
    }),
    registrationOwnerAcknowledgement: boolean(
      'registration_owner_acknowledgement',
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('firebase_identity_reservations_email_unique').on(
      sql`lower(btrim(${table.normalizedEmail}))`,
    ),
    uniqueIndex('firebase_identity_reservations_uid_unique').on(
      table.firebaseUid,
    ),
  ],
);

export const firebaseIdentityReservationRowSelection = getTableColumns(
  firebaseIdentityReservations,
);
