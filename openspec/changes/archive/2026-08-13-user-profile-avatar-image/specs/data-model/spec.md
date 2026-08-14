## ADDED Requirements

### Requirement: User Avatar Source Is Stored

Each local user record MUST store which source owns its current avatar, so identity synchronisation and explicit profile updates cannot silently overwrite each other.

#### Scenario: Avatar ownership is persisted alongside the avatar

- **WHEN** the backend stores a user avatar
- **THEN** the user record also records whether the avatar is owned by the identity provider or by the user

#### Scenario: Records default to provider ownership

- **GIVEN** a user record created before avatar ownership was tracked
- **WHEN** the backend reads that record
- **THEN** its avatar is treated as owned by the identity provider

#### Scenario: Ownership is internal to the backend

- **WHEN** the backend serialises a user for any API response
- **THEN** the avatar source is not part of the public user contract
