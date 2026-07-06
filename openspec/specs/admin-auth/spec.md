# Frontend Admin Authentication Specification

## Purpose

Define `admin-web` authentication behavior for login exchange handling, session restoration, and logout cleanup.

## Requirements

### Requirement: Admin Login Exchange Behavior

The `admin-web` frontend MUST authenticate through Firebase Auth and normalize successful or failed backend token exchanges through its auth session layer so admin entry behavior stays aligned with `user-web`.

#### Scenario: Email and password login succeeds

- **WHEN** an admin-web user successfully authenticates with email and password through Firebase Auth and the backend token exchange succeeds
- **THEN** the frontend stores the new access token in session state
- **AND** the frontend persists the rotated refresh token for later restoration
- **AND** the frontend resolves the authenticated user profile for the active session

#### Scenario: Google login succeeds

- **WHEN** an admin-web user successfully authenticates with Google through Firebase Auth and the backend token exchange succeeds
- **THEN** the frontend stores the new access token in session state
- **AND** the frontend persists the rotated refresh token for later restoration
- **AND** the frontend resolves the authenticated user profile for the active session

#### Scenario: Login exchange fails

- **WHEN** the admin-web auth flow receives a failing login result from the identity provider or backend exchange
- **THEN** the frontend remains in a guest session state
- **AND** the frontend does not keep stale access or refresh tokens from the failed attempt

### Requirement: Admin Session Bootstrap Restoration

The `admin-web` frontend MUST normalize application startup based on persisted refresh-token state before protected-route navigation is treated as final.

#### Scenario: Stored refresh token restores the session

- **WHEN** application bootstrap begins with a valid persisted refresh token
- **THEN** the frontend restores an authenticated session from the refresh flow
- **AND** the frontend replaces the persisted refresh token with the rotated value returned by the backend
- **AND** the bootstrap state completes as authenticated

#### Scenario: Refresh token is missing or invalid

- **WHEN** application bootstrap begins without a usable persisted refresh token or with an invalid or rejected persisted refresh token
- **THEN** the frontend clears the unusable persisted refresh token when one exists
- **AND** the frontend completes bootstrap in a guest session state

#### Scenario: Stale session state is cleared after failed login exchange

- **WHEN** the admin-web auth flow starts from stale local session state and the identity-provider step or backend token exchange fails
- **THEN** the frontend clears the stale access token and persisted refresh token
- **AND** the frontend completes the flow in a guest session state

### Requirement: Admin Logout Cleanup

The `admin-web` frontend MUST clear local session state during logout even if the backend logout request fails, so the browser returns to a consistent guest state.

#### Scenario: Logout completes successfully

- **WHEN** an authenticated admin-web user logs out and the backend accepts the logout request
- **THEN** the frontend clears the access token from session state
- **AND** the frontend clears the persisted refresh token
- **AND** the frontend returns the app to guest behavior on the login route

#### Scenario: Logout API request fails

- **WHEN** an authenticated admin-web user logs out and the backend logout request fails
- **THEN** the frontend still clears the local access token from session state
- **AND** the frontend still clears the persisted refresh token
- **AND** the frontend returns the app to guest behavior on the login route

### Requirement: Admin Active Workspace Switch Session Handling

The `admin-web` frontend MUST switch active workspace context through the shared auth session layer by replacing the current token pair only after a successful switch response and by preserving the existing session when the switch fails.

#### Scenario: Admin workspace switch replaces local session tokens

- **GIVEN** an authenticated `admin-web` session has loaded another available workspace membership
- **WHEN** the user selects that workspace and the switch API returns a token pair
- **THEN** the frontend replaces the in-memory access token with the returned access token
- **AND** the frontend replaces the persisted refresh token with the returned refresh token
- **AND** stale workspace-scoped server state is cleared before reloading shell data

#### Scenario: Admin workspace switch failure preserves current session

- **GIVEN** an authenticated `admin-web` user attempts to switch workspaces
- **WHEN** the switch API rejects the request or the request fails
- **THEN** the frontend keeps the existing access token and refresh token
- **AND** the frontend keeps the current workspace context active
- **AND** the frontend surfaces retryable feedback without returning the user to guest state
