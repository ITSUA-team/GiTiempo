## ADDED Requirements

### Requirement: Shared Workspace GitHub Organization Policy Contracts
The shared contracts SHALL define stable request and response shapes for workspace GitHub organization allow-list management.

#### Scenario: Allowed organization response uses shared schema
- **GIVEN** the backend returns a workspace allowed GitHub organization
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared allowed organization contract
- **AND** the payload includes an identifier, workspace identifier, organization login, created timestamp, and creating user identifier when available
- **AND** the payload excludes GitHub token material

#### Scenario: Organization list response uses shared schema
- **GIVEN** the backend returns the workspace GitHub organization policy list
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared organization list response contract
- **AND** the payload contains an array of allowed organization items

#### Scenario: Add organization request validates login
- **GIVEN** a client constructs an add allowed GitHub organization request
- **WHEN** the payload is validated against the shared schema
- **THEN** the payload requires a non-empty GitHub organization login
- **AND** the payload rejects unknown additional fields

#### Scenario: Invalid organization login is rejected by shared schema
- **GIVEN** a client constructs an add allowed GitHub organization request with an empty or whitespace-only login
- **WHEN** the payload is validated against the shared schema
- **THEN** the payload is rejected as invalid

### Requirement: Workspace GitHub Organization Rejections Are Frontend-Safe
The shared API contract SHALL expose stable, frontend-safe recovery payloads for add-organization failures that the admin Settings page can map to GitHub App access recovery cards.

#### Scenario: Add organization rejection exposes recovery payload
- **GIVEN** the backend rejects an add allowed GitHub organization request for a recoverable GitHub connection or provider access reason
- **WHEN** frontend code consumes the error payload
- **THEN** the payload matches the standard API error envelope with `statusCode`, `error`, `message`, optional `code`, optional `requestId`, and optional `details`
- **AND** the payload includes a required `recovery` object
- **AND** the `code` field includes a stable recovery reason category
- **AND** the reason can represent missing GitHub connection, organization not visible, GitHub App blocked or needing approval, and retryable provider failure
- **AND** the payload includes the rejected organization login when available
- **AND** the payload includes ordered GitHub App access recovery steps with stable step identifiers and status values
- **AND** the step identifiers can represent install GitHub App, approve or unblock organization access, reconnect GitHub account, and retry allow-list check
- **AND** the payload excludes GitHub token material and raw provider secrets

#### Scenario: Recovery step statuses use shared schema
- **GIVEN** frontend or backend code consumes a GitHub App access recovery step
- **WHEN** the payload is validated against the shared schema
- **THEN** each step includes a stable id and status
- **AND** unknown step ids or status values are rejected
- **AND** the schema carries no UI copy, external URLs, token material, or raw provider response data
