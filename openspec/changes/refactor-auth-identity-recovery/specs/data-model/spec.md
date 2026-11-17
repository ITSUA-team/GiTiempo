# Spec Delta

## ADDED Requirements

### Requirement: Aged Unbound Registration Reservations Are Observable
The system SHALL surface a deterministic signal for registration reservations that remain unbound past a configurable age threshold, so operators can detect stranded registrations. Observation MUST NOT grant application access, reveal the registration password, or alter the reservation lifecycle. A reservation whose Firebase outcome is uncertain SHALL remain retained and observable, never expired by the signal alone.

#### Scenario: Aged unbound registration reservation is surfaced
- **GIVEN** a registration reservation has stayed in the reserved state longer than the configured age threshold
- **WHEN** the observability signal is evaluated
- **THEN** the system reports that reservation as aged and unbound
- **AND** the report identifies the reserved normalized email and reserved Firebase UID without exposing the original password or session credentials

#### Scenario: Recently created or bound reservation is not flagged
- **GIVEN** a registration reservation is younger than the age threshold or has transitioned to bound
- **WHEN** the observability signal is evaluated
- **THEN** the system does not flag it as aged and unbound

#### Scenario: Observation does not grant access or mutate the reservation
- **GIVEN** an aged unbound registration reservation exists
- **WHEN** an operator inspects the observability signal
- **THEN** no local user, workspace, membership, or session is created
- **AND** the reservation state, UID, and original non-secret foundation payload remain unchanged

#### Scenario: Uncertain Firebase outcome remains retained
- **GIVEN** an aged unbound reservation has an unknown Firebase creation outcome
- **WHEN** the observability signal is evaluated
- **THEN** the system retains the reservation because a late provider creation may still finish
- **AND** the signal does not expire, delete, recreate, or reassign the reserved UID

### Requirement: Operator Recovery Is Audited And Reuses Identity Locks
The system SHALL provide an operator-initiated recovery path for a registration reservation that is conclusively abandoned, reusing the same identity locks, reservation identity, and adoption checks as automated exact-UID recovery. The operator path MUST record an audit entry with the non-secret reservation provenance and the operator decision. It MUST NOT delete an identity that is bound, adopted, or whose provider existence is uncertain.

#### Scenario: Conclusively abandoned reservation can be resolved by an operator
- **GIVEN** an aged unbound registration reservation is proven conclusively abandoned: the reserved Firebase UID is confirmed absent by the provider and the identity is not bound or adopted by any committed local account
- **WHEN** an operator initiates recovery under the shared identity locks
- **THEN** the system resolves the reservation and records an audit entry with the reservation identity and operator decision
- **AND** the original non-secret registration intent is preserved in the audit record without the password

#### Scenario: Uncertain outcome is never resolved by operator action
- **GIVEN** an aged unbound reservation has an uncertain Firebase creation outcome, including a single temporary user-not-found observation
- **WHEN** an operator attempts recovery
- **THEN** the system refuses to resolve it and retains the reservation
- **AND** a late provider creation completing after the observation is never erased

#### Scenario: Generic errors and arbitrary deletion never authorize cleanup
- **GIVEN** a recovery assessment encounters a generic network error, an internal error, a single user-not-found lookup, or an arbitrary SQL deletion request
- **WHEN** the operator path evaluates authorization for provenance cleanup
- **THEN** the system does not authorize cleanup of the reservation or its provider identity
- **AND** provider creation that may have completed after a lost response is preserved

#### Scenario: Adopted or bound identity is never deleted
- **GIVEN** an aged reservation's Firebase UID has been bound or adopted by a committed local account
- **WHEN** an operator initiates recovery against that reservation
- **THEN** the system refuses to delete the identity or alter the bound reservation
- **AND** the committed local account, workspace, membership, and sessions are unaffected

#### Scenario: Operator recovery preserves exact-UID authenticated recovery
- **GIVEN** a registration reservation is retained for exact-UID authenticated recovery
- **WHEN** the operator recovery path is added alongside automated recovery
- **THEN** backend-verified authentication proving control of the exact reserved UID still completes or reuses the original foundation under the shared locks
- **AND** the operator path does not change the canonical UID, credentials, or two-sided verified-email proof rules
