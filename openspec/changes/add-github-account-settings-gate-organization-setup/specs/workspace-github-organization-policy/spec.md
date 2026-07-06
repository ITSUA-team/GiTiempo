## ADDED Requirements

### Requirement: Workspace GitHub Organization Setup Requires Connected User Account

The system SHALL expose workspace GitHub organization setup actions only when the current user has a connected GitHub account, while continuing to show existing workspace organization policy state when it can be loaded.

#### Scenario: Add organization is hidden before GitHub account connection

- **GIVEN** the current user has no connected GitHub account
- **WHEN** the user opens workspace GitHub organization policy management
- **THEN** the `Add organization` setup action is not exposed
- **AND** the user is told that a connected GitHub account is required before adding organizations

#### Scenario: Add organization is hidden when connection status cannot be confirmed

- **WHEN** the current user's GitHub connection status is loading or failed to load
- **THEN** workspace GitHub organization policy management does not expose the `Add organization` setup action
- **AND** no organization add request is sent from that setup UI state

#### Scenario: Existing policy remains visible while disconnected

- **GIVEN** the current user's GitHub account is disconnected
- **AND** the workspace has saved GitHub organization policy records
- **WHEN** the user opens workspace GitHub organization policy management and policy data loads successfully
- **THEN** the saved allowed organization logins remain visible
- **AND** supported non-add management actions remain governed by the workspace policy response and the user's existing workspace permissions

#### Scenario: Connected user can start organization setup

- **GIVEN** the current user has a connected GitHub account
- **AND** workspace GitHub organization policy data has loaded successfully
- **WHEN** the user opens workspace GitHub organization policy management
- **THEN** the `Add organization` setup action is exposed according to the existing workspace policy management rules
- **AND** submitted organization additions continue to be validated by the backend against the user's GitHub provider access and the workspace policy constraints
