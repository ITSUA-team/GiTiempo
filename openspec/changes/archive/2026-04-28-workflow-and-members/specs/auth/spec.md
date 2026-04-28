## MODIFIED Requirements

### Requirement: API Session Token Pair
The backend SHALL issue an access token and refresh token pair after successful login for a user with active workspace membership.

#### Scenario: Successful login returns token pair with workspace context
- **GIVEN** the backend has verified the Firebase identity token
- **AND** the verified identity maps to a local user with active workspace membership
- **WHEN** the login flow completes successfully
- **THEN** the response includes an access token for authenticated API calls
- **AND** the response includes a refresh token for session renewal
- **AND** the access token carries the authenticated subject, email, Firebase UID, workspace ID, and workspace role claims

#### Scenario: Refresh rotates session credentials for active member
- **GIVEN** a client presents a valid refresh token for a user with active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend invalidates the previous refresh token
- **AND** the backend returns a fresh access token and refresh token pair
- **AND** the new access token carries the user's current workspace ID and role claims

#### Scenario: Refresh is rejected after membership removal
- **GIVEN** a client presents a valid refresh token
- **AND** the session owner no longer has active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized

### Requirement: Authenticated Request Enforcement
Protected backend endpoints MUST require a valid API access token in the `Authorization` header.

#### Scenario: Authenticated access to protected route
- **GIVEN** a client includes a valid access token in the `Authorization: Bearer` header
- **WHEN** the client calls a protected API endpoint
- **THEN** the backend allows the request to proceed
- **AND** the authenticated user context is available to downstream request handling
- **AND** that context includes the user's workspace ID and role

#### Scenario: Missing access token on protected route
- **GIVEN** a protected API endpoint is called without a valid bearer token
- **WHEN** the backend evaluates the request
- **THEN** the backend rejects the request as unauthorized

### Requirement: Membership-Gated Login
The backend MUST reject login and refresh attempts when the verified Firebase identity does not have an active workspace membership. Application access is invite-only — the login endpoint never creates users or memberships.

#### Scenario: Login succeeds for user with active membership
- **GIVEN** a verified Firebase identity maps to a local user with an active workspace membership
- **WHEN** the user logs in
- **THEN** the backend issues a token pair with workspace context claims
- **AND** the backend may refresh mutable profile fields sourced from identity data

#### Scenario: Login is rejected without active membership
- **GIVEN** a verified Firebase identity does not map to an active workspace membership
- **WHEN** the user attempts to log in
- **THEN** the backend rejects the request as unauthorized (401)

#### Scenario: Refresh is rejected without active membership
- **GIVEN** a client presents a valid refresh token for a user whose workspace membership has been removed
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized (401)
