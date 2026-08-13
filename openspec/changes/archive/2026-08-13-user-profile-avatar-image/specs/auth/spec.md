## MODIFIED Requirements

### Requirement: Local User Upsert On First Login

The backend MUST ensure that a verified Firebase identity maps to a local user record, creating one on first login and reusing it on subsequent logins.

#### Scenario: First login creates local user

- **GIVEN** a verified Firebase identity has no matching local user record
- **WHEN** the user completes the login flow
- **THEN** the backend creates a local user with the verified identity attributes
- **AND** future authenticated requests resolve to that same local user

#### Scenario: Returning login updates mapped user

- **GIVEN** a verified Firebase identity already maps to a local user record
- **WHEN** the user logs in again
- **THEN** the backend reuses the existing local user record
- **AND** the backend may refresh mutable profile fields sourced from the verified identity

#### Scenario: Returning login refreshes a provider-owned avatar

- **GIVEN** a mapped local user whose stored avatar is owned by the identity provider
- **AND** the verified identity supplies a picture that differs from the stored avatar
- **WHEN** the user logs in again
- **THEN** the backend replaces the stored avatar with the picture from the verified identity
- **AND** the avatar remains owned by the identity provider

#### Scenario: Returning login fills a missing avatar

- **GIVEN** a mapped local user with no stored avatar
- **AND** the verified identity supplies a picture
- **WHEN** the user logs in again
- **THEN** the backend stores that picture as the user's avatar
- **AND** the avatar is owned by the identity provider

#### Scenario: Returning login never replaces a user-owned avatar

- **GIVEN** a mapped local user whose stored avatar is owned by the user
- **AND** the verified identity supplies a different picture
- **WHEN** the user logs in again
- **THEN** the backend leaves the stored avatar unchanged
- **AND** the avatar remains owned by the user

#### Scenario: Login without a picture claim leaves the avatar intact

- **GIVEN** a mapped local user with a stored avatar
- **AND** the verified identity supplies no picture
- **WHEN** the user logs in again
- **THEN** the backend leaves the stored avatar unchanged
- **AND** the backend does not clear the avatar

#### Scenario: Invite acceptance applies the same avatar rules

- **GIVEN** a verified Firebase identity accepting a workspace invite for an existing local user record
- **WHEN** the backend synchronises that user record from the verified identity
- **THEN** the avatar is refreshed, filled, or preserved by the same ownership rules used on login
