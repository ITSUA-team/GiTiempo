## MODIFIED Requirements

### Requirement: GitHub Connection Status

The system SHALL allow authenticated application surfaces to read the current user's GitHub connection status as a safe feature gate without exposing GitHub token material.

#### Scenario: User has no GitHub connection

- **GIVEN** an authenticated user has no stored GitHub connection
- **WHEN** the user requests GitHub connection status
- **THEN** the system SHALL return `{ status: "disconnected", account: null }`
- **AND** the response MUST NOT include access tokens, refresh tokens, encrypted token values, or token secrets

#### Scenario: User has active GitHub connection

- **GIVEN** an authenticated user has an active GitHub connection
- **WHEN** the user requests GitHub connection status
- **THEN** the system SHALL return `status: "connected"`
- **AND** the response SHALL include only safe account metadata such as `account.githubUserId`, `account.login`, `account.avatarUrl`, `account.connectedAt`, and `account.updatedAt`
- **AND** the response MUST NOT include access tokens, refresh tokens, encrypted token values, token secrets, or raw provider authorization details

#### Scenario: Frontend setup flow checks connection prerequisite

- **GIVEN** an authenticated frontend flow needs to know whether the current user can start a GitHub-backed setup action
- **WHEN** the flow requests GitHub connection status
- **THEN** the system SHALL return only the current user's connection status and safe account display fields
- **AND** the client can treat provider-dependent controls as unavailable until the user connects GitHub
- **AND** the response SHALL NOT include workspace GitHub organization policy rows or grant access to organizations beyond what the user's GitHub account and workspace policy allow
