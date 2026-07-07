## ADDED Requirements

### Requirement: Current User GitHub Organizations Can Be Listed For Workspace Setup

The system SHALL expose a setup-only GitHub organization list for authenticated users with a connected GitHub account so Admin Settings can offer organizations to add to the workspace allow-list without exposing token material or granting workspace provider access.

#### Scenario: Connected user lists organizations for setup

- **GIVEN** an authenticated user has a usable connected GitHub account
- **WHEN** the user requests the setup GitHub organization list
- **THEN** the system SHALL request organization owners visible to that user's connected GitHub account
- **AND** the response SHALL use the existing GitHub owner list response shape with organization owner metadata only
- **AND** the response MUST NOT include access tokens, refresh tokens, encrypted token values, token secrets, or raw provider authorization details

#### Scenario: Disconnected user cannot list setup organizations

- **GIVEN** an authenticated user has no usable connected GitHub account
- **WHEN** the user requests the setup GitHub organization list
- **THEN** the system MUST reject the request without calling GitHub provider APIs
- **AND** the response MUST NOT expose GitHub token material or raw provider secrets

#### Scenario: Setup organization list is not workspace browsing access

- **GIVEN** an authenticated connected user can access GitHub organizations that are not yet allowed for the current workspace
- **WHEN** the user requests the setup GitHub organization list
- **THEN** the system SHALL NOT filter the returned organization owners by the workspace GitHub organization allow-list
- **AND** the response SHALL NOT create, remove, or modify workspace GitHub organization policy rows
- **AND** the response SHALL NOT grant access to repositories, projects, issues, or organization-scoped browsing beyond what separate browsing and workspace policy endpoints allow
