import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { FIREBASE_IDENTITY_RESERVATION_STATES } from './firebase-identity-reservations.schema';
import { identityRecoveryAudit } from './identity-recovery-audit.schema';

describe('FIREBASE_IDENTITY_RESERVATION_STATES', () => {
  it('extends the lifecycle with the resolved state', () => {
    expect(FIREBASE_IDENTITY_RESERVATION_STATES).toContain('resolved');
  });

  it('keeps the pre-existing lifecycle states', () => {
    expect(FIREBASE_IDENTITY_RESERVATION_STATES).toEqual(
      expect.arrayContaining(['reserved', 'confirmed', 'bound']),
    );
  });
});

describe('identityRecoveryAudit', () => {
  const columns = getTableColumns(identityRecoveryAudit);

  it('targets the identity_recovery_audit table', () => {
    expect(getTableConfig(identityRecoveryAudit).name).toBe(
      'identity_recovery_audit',
    );
  });

  it('declares audit columns with types and nullability', () => {
    const schema = Object.entries(columns).map(
      ([key, column]) =>
        [key, column.name, column.getSQLType(), column.notNull] as const,
    );
    expect(schema).toEqual([
      ['id', 'id', 'uuid', true],
      ['reservationId', 'reservation_id', 'uuid', true],
      ['normalizedEmail', 'normalized_email', 'varchar(255)', true],
      ['firebaseUid', 'firebase_uid', 'varchar(128)', true],
      ['purpose', 'purpose', 'varchar(32)', true],
      [
        'registrationDisplayName',
        'registration_display_name',
        'varchar(255)',
        false,
      ],
      [
        'registrationWorkspaceName',
        'registration_workspace_name',
        'varchar(255)',
        false,
      ],
      ['operatorIdentity', 'operator_identity', 'varchar(255)', true],
      ['operatorDecision', 'operator_decision', 'varchar(255)', true],
      ['providerAbsenceEvidence', 'provider_absence_evidence', 'text', false],
      ['createdAt', 'created_at', 'timestamp with time zone', true],
      ['updatedAt', 'updated_at', 'timestamp with time zone', true],
    ]);
  });

  it('restricts deletes of the referenced reservation', () => {
    const [foreignKey] = getTableConfig(identityRecoveryAudit).foreignKeys;
    const reference = foreignKey.reference();
    expect(getTableName(reference.foreignTable)).toBe(
      'firebase_identity_reservations',
    );
    expect(reference.foreignColumns.map((column) => column.name)).toEqual([
      'id',
    ]);
    expect(reference.columns.map((column) => column.name)).toEqual([
      'reservation_id',
    ]);
    expect(foreignKey.onDelete).toBe('restrict');
  });
});
