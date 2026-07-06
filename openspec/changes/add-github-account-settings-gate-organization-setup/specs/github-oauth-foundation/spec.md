## MODIFIED Requirements

### Requirement: GitHub Connection Status

The system SHALL allow an authenticated user to read their GitHub connection status without exposing token material, including when frontend setup flows use the status as a prerequisite check.

#### Scenario: User has no GitHub connection
- **GIVEN** an authenticated user has no stored GitHub connection
- **WHEN** the user requests GitHub connection status
- **THEN** the system SHALL return `{ status: "disconnected", account: null }`
- **AND** the response MUST NOT include access tokens, refresh tokens, or token secrets

#### Scenario: User has active GitHub connection
- **GIVEN** an authenticated user has an active GitHub connection
- **WHEN** the user requests GitHub connection status
- **THEN** the system SHALL return `status: "connected"`
- **AND** the response SHALL include `account.githubUserId`, `account.login`, `account.avatarUrl`, `account.connectedAt`, and `account.updatedAt`
- **AND** the response MUST NOT include access tokens, refresh tokens, or token secrets

#### Scenario: Frontend setup flow checks connection prerequisite
- **GIVEN** an authenticated frontend flow needs to know whether the current user can start a GitHub-backed setup action
- **WHEN** the flow requests GitHub connection status
- **THEN** the system SHALL return only the current user's connection status and safe account display fields
- **AND** the response MUST NOT include access tokens, refresh tokens, token secrets, or provider authorization details beyond the safe status payload
