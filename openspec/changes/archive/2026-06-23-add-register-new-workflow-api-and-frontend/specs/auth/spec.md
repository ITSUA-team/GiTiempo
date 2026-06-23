## MODIFIED Requirements

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

#### Scenario: Refresh is rejected without active membership

- **GIVEN** a client presents a valid refresh token for a user whose workspace membership has been removed
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized (401)

#### Scenario: Registration is separate from login

- **GIVEN** a client needs to create the first owner for a new workspace
- **WHEN** the client submits registration data
- **THEN** the backend uses the dedicated registration endpoint instead of the login endpoint
- **AND** `/auth/login` still does not create users, workspaces, or memberships

## ADDED Requirements

### Requirement: Registration Session Issuance
The backend SHALL issue the normal API token pair after successful first-owner registration.

#### Scenario: Successful registration returns owner session
- **GIVEN** registration has created a Firebase identity, local user, workspace, and active owner membership
- **WHEN** the registration response is produced
- **THEN** the response includes an access token for authenticated API calls
- **AND** the response includes a refresh token for session renewal
- **AND** the access token carries the registered user's subject, email, Firebase UID, workspace ID, and owner role claims
