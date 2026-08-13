## MODIFIED Requirements

### Requirement: Current User Update Validation

The backend SHALL allow updates only to mutable current-user profile fields defined by the shared contracts. Updates MUST be scoped to the authenticated user resolved from the access token and MUST NOT allow a client to target another user's record. Setting an avatar through this endpoint MUST mark the avatar as owned by the user so later identity synchronisation does not replace it.

#### Scenario: Update display name or avatar

- **GIVEN** an authenticated user sends a valid current-user update payload
- **WHEN** the backend processes the request
- **THEN** the backend updates only the mutable profile fields of the authenticated user
- **AND** the updated public profile is returned

#### Scenario: Setting an avatar takes ownership away from the provider

- **GIVEN** an authenticated user whose stored avatar is owned by the identity provider
- **WHEN** the user sends a current-user update containing a non-null avatar
- **THEN** the backend stores that avatar
- **AND** the avatar becomes owned by the user

#### Scenario: Clearing an avatar returns ownership to the provider

- **GIVEN** an authenticated user whose stored avatar is owned by the user
- **WHEN** the user sends a current-user update setting the avatar to null
- **THEN** the backend clears the stored avatar
- **AND** the avatar becomes owned by the identity provider so the next login can refill it

#### Scenario: Updating other profile fields leaves avatar ownership unchanged

- **GIVEN** an authenticated user with a stored avatar
- **WHEN** the user sends a current-user update that omits the avatar field
- **THEN** the backend leaves both the stored avatar and its ownership unchanged

#### Scenario: Empty current-user update payload

- **GIVEN** an authenticated user sends an empty current-user update payload
- **WHEN** the backend validates the request
- **THEN** the request is rejected as invalid

#### Scenario: Unauthenticated current-user update

- **GIVEN** no valid access token is presented
- **WHEN** a current-user update request is received
- **THEN** the backend rejects the request as unauthorized
