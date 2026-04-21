# Shared Contracts Specification

## Purpose

Define the shared cross-layer contract behavior that backend and frontend code consume through `packages/shared`.

## Requirements

### Requirement: Shared Public User Contract

The shared contracts MUST define a public user shape that both frontend applications and the backend can rely on.

#### Scenario: Current user response uses shared public schema

- GIVEN the backend returns current-user data
- WHEN frontend code consumes the response
- THEN the payload matches the shared public user contract
- AND the contract excludes internal-only auth provider identifiers

### Requirement: Shared Current User Update Validation

The shared contracts SHALL define validation rules for current-user profile updates.

#### Scenario: Valid mutable profile update

- GIVEN a request updates display name or avatar URL
- WHEN the request payload satisfies the shared validation rules
- THEN the backend can accept the payload using the shared schema

#### Scenario: Empty mutable profile update

- GIVEN a request sends no mutable profile fields
- WHEN the shared schema validates the payload
- THEN the payload is rejected as invalid

### Requirement: Shared Frontend App Identity Contract

The shared contracts SHOULD provide stable identifiers for frontend application identity where cross-package behavior depends on them.

#### Scenario: Shared web app name usage

- GIVEN shared configuration needs to distinguish frontend applications
- WHEN the app identity is read from shared contracts
- THEN the value resolves to one of the supported web application names
