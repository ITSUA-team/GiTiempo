## MODIFIED Requirements

### Requirement: Shared GitHub Connection Status Contract

The shared contracts SHALL define a discriminated identity status with independent OAuth, capability and disconnect-eligibility fields. A disconnected identity SHALL have status disconnected and account null. A connected identity SHALL have status connected and safe account fields githubUserId, login, avatarUrl, connectedAt and updatedAt with the existing types. Both variants SHALL carry oauth, capabilities and disconnect fields. No variant SHALL expose tokens, encrypted values, PKCE material or secrets.

#### Scenario: OAuth readiness is separate from App access
- **GIVEN** the backend returns a connection status
- **WHEN** shared schemas parse the payload
- **THEN** oauth.status SHALL be one of not_authorized, authorized or reauthorization_required and oauth.missingScopes SHALL contain only known requested scope names
- **AND** capabilities.organizationDiscovery and capabilities.personalData SHALL each be one of ready, authorization_required or permission_required
- **AND** disconnect SHALL be one of allowed, alternative_signin_required or verification_unavailable

#### Scenario: Disconnected payload has explicit capabilities
- **GIVEN** no identity link exists
- **WHEN** the backend returns status
- **THEN** account SHALL be null and both capabilities SHALL require authorization
- **AND** oauth SHALL be not_authorized and disconnect SHALL be allowed for idempotent cleanup

#### Scenario: Connected payload does not grant installation access
- **GIVEN** a personal identity is linked
- **WHEN** a frontend consumes the connection contract
- **THEN** safe account fields SHALL preserve string GitHub ID/login, nullable avatarUrl and ISO timestamps
- **AND** the client MUST use capability fields for feature gates and separate workspace contracts for installation state

#### Scenario: Actual scope normalization
- **GIVEN** GitHub reports a broader granted scope that includes a requested read scope
- **WHEN** the server derives missingScopes
- **THEN** the included scope SHALL NOT be falsely listed as missing
- **AND** the system MUST NOT request a broader scope solely to simplify normalization

### Requirement: Workspace GitHub Organization Rejections Are Frontend-Safe
The shared API contract SHALL expose stable, frontend-safe recovery payloads for add-organization failures that the admin Settings page can map to OAuth organization-access recovery cards.

#### Scenario: Add organization rejection exposes recovery payload
- **GIVEN** the backend rejects an add allowed GitHub organization request for a recoverable GitHub connection or provider access reason
- **WHEN** frontend code consumes the error payload
- **THEN** the payload matches the standard API error envelope with `statusCode`, `error`, `message`, optional `code`, optional `requestId`, and optional `details`
- **AND** the payload includes a required `recovery` object
- **AND** the `code` field includes a stable recovery reason category
- **AND** the reason can represent missing GitHub connection, organization not visible, OAuth permission missing or organization OAuth access restricted, and retryable provider failure
- **AND** the payload includes the rejected organization login when available
- **AND** the payload includes ordered OAuth organization-access recovery steps with stable step identifiers and status values
- **AND** the step identifiers can represent authorize OAuth, grant required OAuth permission, approve or unblock organization OAuth access, and retry allow-list check
- **AND** the payload excludes GitHub token material and raw provider secrets

#### Scenario: Recovery step statuses use shared schema
- **GIVEN** frontend or backend code consumes a OAuth organization-access recovery step
- **WHEN** the payload is validated against the shared schema
- **THEN** each step includes a stable id and status
- **AND** unknown step ids or status values are rejected
- **AND** the schema carries no UI copy, external URLs, token material, or raw provider response data

#### Scenario: Installation recovery stays separate
- **GIVEN** an organization addition fails due to OAuth membership or policy
- **WHEN** the frontend renders recovery
- **THEN** it MUST NOT present App installation as a prerequisite to saving the organization policy
- **AND** separate installation setup failures SHALL retain their existing App-specific recovery contracts

## ADDED Requirements

### Requirement: Shared GitHub Account Recovery Contracts

The shared contracts SHALL expose stable safe recovery errors for identity conflicts, mismatched identities, missing OAuth authorization/permissions and blocked or unverifiable disconnect eligibility. Full Disconnect SHALL report local unlink separately from provider revocation confirmation. Provider errors MUST NOT disclose another user's identity or secret material.

#### Scenario: Cross-user link conflict
- **GIVEN** a GitHub ID is owned by another GiTiempo user
- **WHEN** an authenticated link or sign-in ownership commit conflicts
- **THEN** the response SHALL identify an account-link conflict without including the owner's email, name or workspace

#### Scenario: Complete local unlink with revocation warning
- **GIVEN** local removal succeeds but provider revocation cannot be confirmed
- **WHEN** the API returns Disconnect result
- **THEN** the response SHALL have disconnected true and providerRevocation unconfirmed
- **AND** clients SHALL show the disconnected state plus safe warning, not retain a false connected state

#### Scenario: Provider revocation confirmed or unnecessary
- **GIVEN** local unlink completes
- **WHEN** the API returns the result
- **THEN** providerRevocation SHALL be confirmed when revocation succeeded or not_required when no revocable credentials remained

#### Scenario: Eligibility blocks unlink
- **GIVEN** another usable login method is absent or cannot be verified
- **WHEN** Disconnect is rejected
- **THEN** the response SHALL distinguish alternative_signin_required from verification_unavailable
- **AND** the previous link and credentials SHALL remain intact
