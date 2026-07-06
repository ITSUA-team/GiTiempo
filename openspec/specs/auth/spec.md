# Backend Authentication Specification

## Purpose

Define server-side authentication behavior for verifying identity, issuing API tokens, and enforcing authenticated access in the NestJS API.
## Requirements
### Requirement: Firebase Identity Verification

The backend MUST accept a Firebase identity token during login and verify it against the configured Firebase project before creating an authenticated API session. Verification failures MUST NOT issue API session tokens and MUST NOT create or modify local user records.

#### Scenario: Login with valid Firebase identity

- **GIVEN** a frontend client has authenticated a user with Firebase Auth
- **WHEN** the client sends the Firebase identity token to the API login endpoint
- **THEN** the backend verifies the token against the configured Firebase project
- **AND** the backend associates the verified identity with a local user record
- **AND** the backend emits a successful-login audit event

#### Scenario: Login with invalid Firebase identity

- **GIVEN** a frontend client sends an invalid, expired, tampered, or wrong-audience Firebase identity token
- **WHEN** the API login endpoint processes the request
- **THEN** the backend rejects the request as unauthorized
- **AND** no application session tokens are issued
- **AND** no local user record is created or modified
- **AND** the backend emits a Firebase-rejection audit event without logging the raw identity token

#### Scenario: Login endpoint rate limiting

- **GIVEN** many login attempts arrive from the same client within a short window
- **WHEN** the attempt count exceeds the per-route login throttle
- **THEN** the backend rejects further attempts as too many requests
- **AND** the rejection happens before any Firebase verification work is performed

### Requirement: API Session Token Pair

The backend SHALL issue an access token and refresh token pair after successful login for a user with active workspace membership. Access tokens MUST carry a minimal, non-sensitive payload suitable for stateless verification. Refresh tokens MUST be opaque, unguessable, stored only as a cryptographic hash at rest, and bound to the workspace membership selected when the session is issued.

#### Scenario: Successful login returns token pair with workspace context

- **GIVEN** the backend has verified the Firebase identity token
- **AND** the verified identity maps to a local user with active workspace membership
- **WHEN** the login flow completes successfully
- **THEN** the response includes an access token for authenticated API calls
- **AND** the response includes a refresh token for session renewal
- **AND** the access token carries the authenticated subject, email, Firebase UID, workspace ID, and workspace role claims

#### Scenario: Refresh token stays bound to the issued workspace membership

- **GIVEN** the backend issues a session for a specific active workspace membership during login or first-owner registration
- **WHEN** the backend persists the refresh token for that session
- **THEN** the persisted refresh-token record keeps the selected workspace membership context
- **AND** later refresh attempts evaluate membership against that stored workspace context instead of selecting a different active membership for the same user

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

#### Scenario: Refresh with expired refresh token

- **GIVEN** a client presents a refresh token whose expiry has passed
- **WHEN** the refresh endpoint processes the request
- **THEN** the backend rejects the request as unauthorized
- **AND** no new token pair is issued

#### Scenario: Refresh with unknown refresh token

- **GIVEN** a client presents a refresh token whose hash does not match any stored session
- **WHEN** the refresh endpoint processes the request
- **THEN** the backend rejects the request as unauthorized
- **AND** refresh-token comparison uses a constant-time algorithm so that mismatch timing does not leak information

### Requirement: Refresh Token Reuse Detection

The backend MUST detect when a previously rotated (revoked) refresh token is presented again and MUST treat it as a session compromise event.

#### Scenario: Revoked refresh token is presented again

- **GIVEN** a refresh token has already been rotated and marked as revoked
- **WHEN** any client presents that revoked token to the refresh endpoint
- **THEN** the backend rejects the request as unauthorized
- **AND** the backend revokes every refresh token that belongs to the same session family
- **AND** the backend emits a reuse-detected audit event

### Requirement: Session Termination On Logout

The backend MUST provide a logout endpoint that terminates the current device's session without affecting other sessions of the same user.

#### Scenario: Logout invalidates current refresh token

- **GIVEN** an authenticated client presents its current refresh token to the logout endpoint
- **WHEN** the logout endpoint processes the request
- **THEN** the presented refresh token is invalidated and can no longer be used to refresh
- **AND** refresh tokens belonging to other sessions of the same user remain valid
- **AND** the backend emits a logout audit event

#### Scenario: Logout with unknown refresh token

- **GIVEN** a client presents a refresh token that is not recognized
- **WHEN** the logout endpoint processes the request
- **THEN** the backend does not leak whether the token existed
- **AND** the response does not issue a new token pair

### Requirement: Authenticated Request Enforcement

Protected backend endpoints MUST require a valid API access token in the `Authorization` header. The authenticated subject MUST be resolvable from the verified access token without an additional database round-trip during request authorization.

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

#### Scenario: Invalid or expired access token on protected route

- **GIVEN** a protected API endpoint is called with a bearer token whose signature, issuer, audience, or expiry is invalid
- **WHEN** the backend evaluates the request
- **THEN** the backend rejects the request as unauthorized
- **AND** the rejection does not disclose which specific check failed

#### Scenario: Public endpoint explicitly opted out

- **GIVEN** an endpoint is explicitly marked as public via the skip-auth marker
- **WHEN** the endpoint is called without any access token
- **THEN** the backend allows the request to proceed

#### Scenario: New endpoint without explicit opt-out

- **GIVEN** a newly added endpoint does not carry the skip-auth marker
- **WHEN** the endpoint is called without a valid access token
- **THEN** the backend rejects the request as unauthorized

### Requirement: Local User Upsert On First Login

The backend MUST ensure that a verified Firebase identity maps to a local user record, creating one on first login and reusing it on subsequent logins.

#### Scenario: First login creates local user

- **GIVEN** a verified Firebase identity has no matching local user record
- **WHEN** the user completes the login flow
- **THEN** the backend creates a local user with the verified identity attributes
- **AND** future authenticated requests resolve to that same local user

#### Scenario: Returning login updates mapped user

- **GIVEN** a verified Firebase identity already maps to a local user record
- **WHEN** the user logs in again
- **THEN** the backend reuses the existing local user record
- **AND** the backend may refresh mutable profile fields sourced from the verified identity

### Requirement: Sensitive Auth Data Redaction

The backend MUST avoid writing raw bearer tokens, Firebase identity tokens, or refresh tokens to logs, traces, or error payloads.

#### Scenario: Auth request is logged

- **WHEN** the backend logs a request that carries authorization headers or auth request bodies
- **THEN** the `Authorization` header value is masked in the log output
- **AND** request-body fields that carry Firebase identity tokens or refresh tokens are masked in the log output

#### Scenario: Auth error is reported

- **WHEN** the backend reports an authentication or refresh error
- **THEN** the error payload does not contain the raw bearer token, Firebase identity token, or refresh token

### Requirement: Membership-Gated Login

The backend MUST reject login and refresh attempts when the verified Firebase identity does not have an active workspace membership. Existing-workspace application access remains invite-only, and the login endpoint never creates users or memberships. First-workspace-owner registration is a separate public endpoint that may issue an initial session only after it creates a workspace and owner membership.

#### Scenario: Login succeeds for user with active membership

- **GIVEN** a verified Firebase identity maps to a local user with an active workspace membership
- **WHEN** the user logs in
- **THEN** the backend issues a token pair with workspace context claims
- **AND** the backend may refresh mutable profile fields sourced from identity data

#### Scenario: Login is rejected without active membership

- **GIVEN** a verified Firebase identity does not map to an active workspace membership
- **WHEN** the user attempts to log in
- **THEN** the backend rejects the request as unauthorized (401)

#### Scenario: Refresh is rejected when the issued workspace membership is gone

- **GIVEN** a client presents a valid refresh token that was issued for a specific active workspace membership
- **AND** the session owner no longer has that exact active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized (401)
- **AND** the backend does not silently move the session onto a different active workspace membership for the same user

#### Scenario: Registration is separate from login

- **GIVEN** a client needs to create the first owner for a new workspace
- **WHEN** the client submits registration data
- **THEN** the backend uses the dedicated registration endpoint instead of the login endpoint
- **AND** `/auth/login` still does not create users, workspaces, or memberships

### Requirement: Registration Session Issuance
The backend SHALL issue the normal API token pair after successful first-owner registration.

#### Scenario: Successful registration returns owner session
- **GIVEN** registration has created a Firebase identity, local user, workspace, and active owner membership
- **WHEN** the registration response is produced
- **THEN** the response includes an access token for authenticated API calls
- **AND** the response includes a refresh token for session renewal
- **AND** the access token carries the registered user's subject, email, Firebase UID, workspace ID, and owner role claims
