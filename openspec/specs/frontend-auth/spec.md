# Frontend Authentication Specification

## Purpose

Define user-web authentication behavior for login exchange handling, session restoration, route guarding, and logout cleanup.

## Requirements

### Requirement: Frontend Login Exchange Behavior

The user-web frontend MUST normalize both successful and failed login attempts through its auth session layer so the application enters the correct authenticated or guest state after a login action.

#### Scenario: Email or Google login succeeds

- **WHEN** the user-web auth flow receives a valid Firebase-backed login result and completes the backend token exchange
- **THEN** the frontend stores the new access token in session state
- **AND** the frontend persists the rotated refresh token for later restoration
- **AND** the frontend resolves the authenticated user profile for the active session

#### Scenario: Login exchange fails

- **WHEN** the user-web auth flow receives a failing login result from the identity provider or backend exchange
- **THEN** the frontend remains in a guest session state
- **AND** the frontend does not keep stale access or refresh tokens from the failed attempt

### Requirement: Frontend Session Bootstrap Restoration

The user-web frontend MUST normalize application startup based on the persisted refresh token state before protected-route navigation is treated as final.

#### Scenario: Stored refresh token restores the session

- **WHEN** application bootstrap begins with a valid persisted refresh token
- **THEN** the frontend restores an authenticated session from the refresh flow
- **AND** the frontend replaces the persisted refresh token with the rotated value returned by the backend
- **AND** the bootstrap state completes as authenticated

#### Scenario: Stored refresh token is invalid

- **WHEN** application bootstrap begins with an invalid or rejected persisted refresh token
- **THEN** the frontend clears the unusable persisted refresh token
- **AND** the frontend completes bootstrap in a guest session state

### Requirement: Frontend Route Guard Redirects

The user-web router MUST redirect users according to their normalized auth state so protected routes require authentication and guest-only routes do not trap signed-in users.

#### Scenario: Anonymous user opens a protected route

- **WHEN** an anonymous session navigates to a protected user-web route
- **THEN** the router redirects the user to `/login`
- **AND** the router preserves the original destination so it can be resumed after authentication

#### Scenario: Authenticated user opens the login route

- **WHEN** an authenticated session navigates to `/login`
- **THEN** the router redirects the user to the default authenticated route or the preserved redirect target

### Requirement: Frontend Logout Cleanup

The user-web frontend MUST clear local session state during logout even if the backend logout request fails, so the browser returns to a consistent guest state.

#### Scenario: Logout completes successfully

- **WHEN** an authenticated user logs out and the backend accepts the logout request
- **THEN** the frontend clears the access token from session state
- **AND** the frontend clears the persisted refresh token
- **AND** the frontend returns the app to guest behavior

#### Scenario: Logout API request fails

- **WHEN** an authenticated user logs out and the backend logout request fails
- **THEN** the frontend still clears the local access token from session state
- **AND** the frontend still clears the persisted refresh token
- **AND** the frontend returns the app to guest behavior
