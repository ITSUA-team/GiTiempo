# Spec Delta

## MODIFIED Requirements

### Requirement: Frontend Login Exchange Behavior

The web frontends MUST normalize successful and failed backend token exchanges through their auth session layer. Google sign-in uses Firebase Auth; GitHub uses the backend handoff. Automatic social-workspace provisioning SHALL enter the normal authenticated flow without an additional form.

#### Scenario: Email and password login succeeds

- **WHEN** the user successfully authenticates with email and password through Firebase Auth and the backend token exchange succeeds
- **THEN** the frontend stores the new access token in session state
- **AND** the frontend persists the rotated refresh token for later restoration
- **AND** the frontend resolves the authenticated user profile for the active session

#### Scenario: Google login succeeds

- **WHEN** the user successfully authenticates with Google through Firebase Auth and the backend token exchange succeeds
- **THEN** the frontend stores the new access token in session state
- **AND** the frontend persists the rotated refresh token for later restoration
- **AND** the frontend resolves the authenticated user profile for the active session

#### Scenario: Login exchange fails

- **WHEN** the user-web auth flow receives a failing login result from the identity provider or backend exchange
- **THEN** the frontend remains in a guest session state
- **AND** the frontend does not keep stale access or refresh tokens from the failed attempt

#### Scenario: Social sign-in creates the first workspace
- **GIVEN** an eligible account has zero memberships
- **WHEN** Google or GitHub sign-in returns the normal token pair after automatic provisioning
- **THEN** user-web or admin-web stores the session, loads the current user and workspace, and follows its normal authenticated destination
- **AND** the workspace initially displays `Workspace` with the admin role
- **AND** no workspace-name, registration, or owner-confirmation step is shown
- **AND** the client does not submit inferred owner acknowledgement or email consent

#### Scenario: Existing social member signs in normally
- **GIVEN** the account already belongs to a workspace
- **WHEN** Google or GitHub sign-in succeeds
- **THEN** the current session-bootstrap and role-based routing behavior remains in effect
- **AND** no additional workspace creation is requested by the client

#### Scenario: Provisioning fails
- **GIVEN** social identity authentication succeeds but the backend cannot complete provisioning
- **WHEN** the client handles the failed exchange
- **THEN** it clears partial application session state and remains on a recoverable guest surface
- **AND** it does not show a successful workspace or retain partial application tokens
