## ADDED Requirements

### Requirement: GitHub Connection Status Supports Settings Feature Gating

The system SHALL allow authenticated application surfaces to use GitHub connection status as a safe feature gate without exposing GitHub token material.

#### Scenario: Admin Settings reads GitHub connection status

- **GIVEN** an authenticated admin opens a Settings surface that depends on the admin's GitHub provider access
- **WHEN** the client requests GitHub connection status
- **THEN** the system SHALL return the existing connected or disconnected status response shape
- **AND** a connected response SHALL include only safe account metadata
- **AND** the response MUST NOT include access tokens, refresh tokens, encrypted token values, or token secrets

#### Scenario: Disconnected status is safe for feature gating

- **GIVEN** an authenticated user has no active GitHub connection
- **WHEN** a client requests GitHub connection status to decide whether to render provider-dependent controls
- **THEN** the system SHALL return `status: "disconnected"` with `account: null`
- **AND** the client can treat the provider-dependent controls as unavailable until the user connects GitHub

#### Scenario: Connected status does not grant workspace policy access

- **GIVEN** an authenticated user has an active GitHub connection
- **WHEN** a client requests GitHub connection status
- **THEN** the system SHALL report only that user's GitHub account connection state
- **AND** the response SHALL NOT include workspace GitHub organization policy rows
- **AND** the response SHALL NOT grant access to GitHub organizations beyond what the user's GitHub account and workspace policy allow
