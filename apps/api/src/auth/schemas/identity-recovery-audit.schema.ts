import { getTableColumns } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  FirebaseIdentityReservationPurpose,
  firebaseIdentityReservations,
} from './firebase-identity-reservations.schema';

/** Provenance for operator recovery of a conclusively abandoned registration reservation. */
export const identityRecoveryAudit = pgTable('identity_recovery_audit', {
  id: uuid('id').defaultRandom().primaryKey(),
  reservationId: uuid('reservation_id')
    .references(() => firebaseIdentityReservations.id, {
      onDelete: 'restrict',
    })
    .notNull(),
  normalizedEmail: varchar('normalized_email', { length: 255 }).notNull(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull(),
  purpose: varchar('purpose', { length: 32 })
    .$type<FirebaseIdentityReservationPurpose>()
    .notNull(),
  registrationDisplayName: varchar('registration_display_name', {
    length: 255,
  }),
  registrationWorkspaceName: varchar('registration_workspace_name', {
    length: 255,
  }),
  registrationOwnerAcknowledgement: boolean(
    'registration_owner_acknowledgement',
  ),
  operatorIdentity: varchar('operator_identity', { length: 255 }).notNull(),
  operatorDecision: varchar('operator_decision', { length: 255 }).notNull(),
  providerAbsenceEvidence: text('provider_absence_evidence'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const identityRecoveryAuditRowSelection = getTableColumns(
  identityRecoveryAudit,
);
