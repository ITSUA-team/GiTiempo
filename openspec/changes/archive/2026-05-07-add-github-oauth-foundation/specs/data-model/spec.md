## ADDED Requirements

### Requirement: GitHub Connection Persistence

The backend data model SHALL persist at most one GitHub connection record per application user.

#### Scenario: User completes GitHub OAuth
- **GIVEN** a user completes GitHub OAuth successfully
- **WHEN** the backend stores the GitHub connection
- **THEN** the row SHALL reference exactly one application user
- **AND** the row SHALL store safe GitHub account metadata
- **AND** the row SHALL store encrypted GitHub access and refresh token material
- **AND** the row SHALL store access token and refresh token expiry timestamps

#### Scenario: User reconnects GitHub
- **GIVEN** a user already has a GitHub connection row
- **WHEN** the user completes GitHub OAuth again
- **THEN** the backend SHALL update the existing row for that user
- **AND** the backend MUST NOT create a duplicate GitHub connection for the same user

#### Scenario: User disconnects GitHub
- **GIVEN** a user has a GitHub connection row with encrypted token material
- **WHEN** the user disconnects GitHub
- **THEN** the row SHALL remain available for connection history
- **AND** the row SHALL no longer contain usable encrypted access or refresh token material
- **AND** the row SHALL be marked disconnected

### Requirement: GitHub OAuth State Persistence

The backend data model SHALL persist server-side GitHub OAuth state records for an unguessable opaque state id, PKCE validation, expiry, user binding, and replay protection.

#### Scenario: OAuth state is created
- **GIVEN** an authenticated user starts GitHub OAuth
- **WHEN** the backend creates OAuth state
- **THEN** the state row SHALL reference the initiating user
- **AND** the state row SHALL store an unguessable opaque state identifier
- **AND** the state row SHALL store a PKCE verifier or equivalent server-side verifier material
- **AND** the state row SHALL store an expiry timestamp
- **AND** the state row SHALL be unconsumed

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
