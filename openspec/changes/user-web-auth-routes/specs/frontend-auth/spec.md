## ADDED Requirements

### Requirement: User-Web Session Bootstrap

The user-web app MUST normalize authentication state before protected navigation is allowed to settle.

#### Scenario: Refresh token restores a session on cold load

- **WHEN** the app starts with a stored refresh token and the backend accepts the refresh request
- **THEN** the app restores an authenticated session before protected navigation resolves
- **AND** the app updates the in-memory access token and persisted refresh token with the rotated token pair

#### Scenario: Missing or invalid refresh token falls back to anonymous state

- **WHEN** the app starts without a usable refresh token or the backend rejects refresh restoration
- **THEN** the app completes bootstrap in an anonymous state
- **AND** any invalid persisted refresh token is cleared

### Requirement: User-Web Login Exchange

The user-web app MUST authenticate through Firebase Auth and exchange the verified Firebase identity for API session tokens.

#### Scenario: Email or password login completes token exchange

- **WHEN** a user successfully authenticates with email and password through Firebase Auth from the login page
- **THEN** the app sends the Firebase identity token to the backend login endpoint
- **AND** the app stores the returned access token in memory and the refresh token in persistent browser storage

#### Scenario: Google SSO login completes token exchange

- **WHEN** a user successfully authenticates with Google through Firebase Auth from the login page
- **THEN** the app sends the Firebase identity token to the backend login endpoint
- **AND** the app stores the returned access token in memory and the refresh token in persistent browser storage

### Requirement: User-Web Logout Cleanup

The user-web app MUST remove authenticated session state when the user signs out or session restoration can no longer continue.

#### Scenario: Explicit logout clears the session

- **WHEN** the authenticated user triggers sign out
- **THEN** the app clears the in-memory access token
- **AND** the app removes the persisted refresh token
- **AND** the app returns the user to the login entry route

#### Scenario: Irrecoverable auth failure clears stale session state

- **WHEN** the app determines that session restoration or refresh can no longer succeed
- **THEN** the app clears any stored session tokens
- **AND** the app treats the browser session as anonymous
