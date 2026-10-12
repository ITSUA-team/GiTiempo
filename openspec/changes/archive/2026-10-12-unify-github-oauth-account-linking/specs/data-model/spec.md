## MODIFIED Requirements

### Requirement: GitHub Connection Persistence

The data model SHALL persist at most one active GitHub identity link per application user and at most one application user per immutable GitHub ID globally. Identity ownership SHALL be independent of credential availability. OAuth and personal App credentials SHALL be encrypted in distinct stores associated with the same link, with actual granted scopes and applicable lifetime metadata.

#### Scenario: Successful authorization persists a typed grant
- **GIVEN** a user proves ownership of an available GitHub ID
- **WHEN** the link and grant are committed
- **THEN** the identity SHALL reference exactly one user and store safe metadata
- **AND** credentials SHALL preserve provider type and applicable refresh/expiry metadata without overwriting the other type

#### Scenario: Global ownership survives workspace changes
- **GIVEN** a GitHub ID is linked in one workspace context
- **WHEN** another user attempts to link it from another workspace
- **THEN** the database SHALL prevent a second owner
- **AND** the existing link and credentials SHALL remain unchanged

#### Scenario: Concurrent identity claims
- **GIVEN** two users authorize the same unlinked GitHub ID concurrently
- **WHEN** both attempt to commit ownership
- **THEN** at most one link SHALL commit
- **AND** the other SHALL receive a safe conflict with no partial credential write

#### Scenario: Same user reconnects
- **GIVEN** a user has an active link
- **WHEN** the same GitHub ID is authorized again
- **THEN** the existing ownership SHALL be reused
- **AND** only the selected grant and safe metadata SHALL be updated

#### Scenario: Full disconnect releases ownership
- **GIVEN** a permitted full Disconnect is executed
- **WHEN** the unlink transaction commits
- **THEN** active ownership and both personal credential stores SHALL be removed
- **AND** retained audit metadata MUST NOT reserve the GitHub ID, retain credentials or support sign-in resolution

#### Scenario: Migration preserves unambiguous App grants
- **GIVEN** a legacy active App connection has unambiguous ownership
- **WHEN** the migration backfills identity links
- **THEN** the existing App credentials SHALL be preserved and associated with that identity
- **AND** no OAuth grant SHALL be fabricated

#### Scenario: Migration unlinks every duplicate legacy owner
- **GIVEN** multiple legacy active users claim one GitHub ID
- **WHEN** migration preflight runs
- **THEN** it SHALL report the duplicate GitHub ID and every affected application user without credentials
- **AND** the preflight SHALL treat the duplicate group as planned cleanup rather than select an owner or merge users
- **WHEN** the migration runs
- **THEN** it SHALL remove every matching legacy personal App connection row for that GitHub ID, including historical rows
- **AND** it SHALL invalidate affected pending legacy OAuth states and persist durable authorization generation/cutoff records for every affected user
- **AND** it MUST NOT fabricate an OAuth grant, revoke provider grants, merge users, choose a winner, or delete GiTiempo sessions, memberships, workspace records, projects, tasks or history
- **AND** each affected user SHALL explicitly relink GitHub and reauthorize personal App data after migration

#### Scenario: Duplicate cleanup is not reversible through rollback
- **GIVEN** migration removed duplicate legacy personal bindings
- **WHEN** the application is rolled back
- **THEN** rollback MUST NOT restore the removed credentials or bindings
- **AND** no restored row MAY reserve the GitHub ID or support sign-in resolution

#### Scenario: Disconnected history cannot grant login
- **GIVEN** a legacy row is disconnected
- **WHEN** identity migration runs
- **THEN** that historical row MUST NOT become an active identity or reserve a GitHub ID

### Requirement: GitHub OAuth State Persistence

The backend data model SHALL persist server-side GitHub OAuth state records for an unguessable opaque state id, PKCE validation, expiry, user/session binding, provider and purpose discrimination, authorization generation, and replay protection for authenticated linking and App authorization.

#### Scenario: OAuth state is created
- **GIVEN** an authenticated user starts GitHub OAuth
- **WHEN** the backend creates OAuth state
- **THEN** the state row SHALL reference the initiating user
- **AND** the state row SHALL store an unguessable opaque state identifier
- **AND** the state row SHALL store a PKCE verifier or equivalent server-side verifier material
- **AND** the state row SHALL store an expiry timestamp
- **AND** the state row SHALL be unconsumed
- **AND** it SHALL bind provider, operation purpose, initiating session and current authorization generation

#### Scenario: OAuth state is consumed atomically
- **GIVEN** a callback uses a valid unconsumed OAuth state
- **WHEN** the backend accepts that state
- **THEN** the state row SHALL be claimed and marked consumed in one atomic persistence operation
- **AND** the backend MUST prevent the same state from being consumed successfully again

#### Scenario: Concurrent state consumption is prevented
- **GIVEN** two callbacks attempt to consume the same valid OAuth state concurrently
- **WHEN** both callbacks reach persistence
- **THEN** at most one callback SHALL receive the consumed state row
- **AND** the other callback MUST treat the state as invalid

#### Scenario: OAuth state expires
- **GIVEN** an OAuth state is past its expiry timestamp
- **WHEN** the backend validates callback state
- **THEN** the state SHALL be treated as invalid
- **AND** the backend MUST NOT create or update a GitHub connection from that state

#### Scenario: Unlink invalidates pending operations
- **GIVEN** a callback, staged login or refresh retains a prior authorization generation
- **WHEN** Disconnect advances the user generation and removes the link
- **THEN** the prior operation MUST NOT commit credentials, identity or a GitHub sign-in session
- **AND** the generation SHALL survive deletion and recreation of the link
