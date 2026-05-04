## ADDED Requirements

### Requirement: Shared GitHub Connection Status Contract

The shared contracts SHALL define the exact response shape for GitHub connection status responses as a discriminated union. A disconnected response SHALL be `{ status: "disconnected", account: null }`. A connected response SHALL be `{ status: "connected", account: { githubUserId, login, avatarUrl, connectedAt, updatedAt } }`, where `githubUserId` and `login` are strings, `avatarUrl` is a nullable string, and `connectedAt` and `updatedAt` are ISO datetime strings.

#### Scenario: Disconnected status response
- **GIVEN** the backend returns GitHub connection status for a disconnected user
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub connection status contract
- **AND** the payload SHALL be `{ status: "disconnected", account: null }`
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets

#### Scenario: Connected status response
- **GIVEN** the backend returns GitHub connection status for a connected user
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub connection status contract
- **AND** the payload SHALL include `status: "connected"`
- **AND** the payload SHALL include `account.githubUserId`, `account.login`, `account.avatarUrl`, `account.connectedAt`, and `account.updatedAt`
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets

### Requirement: Shared GitHub Auth URL Contract

The shared contracts SHALL define the response shape for GitHub authorization URL creation as `{ authorizationUrl: string }`.

#### Scenario: Auth URL response
- **GIVEN** the backend creates a GitHub authorization URL
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload SHALL match the shared GitHub auth URL contract
- **AND** the payload SHALL include `authorizationUrl` as a string
- **AND** the payload MUST NOT include access tokens, refresh tokens, PKCE verifier material, or token secrets
