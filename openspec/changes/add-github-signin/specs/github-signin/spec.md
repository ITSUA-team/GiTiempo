## ADDED Requirements

### Requirement: Backend Login-Scoped GitHub OAuth Flow

The backend MUST provide a login-scoped GitHub OAuth flow — a start, a callback, and a session-exchange endpoint, none requiring an authenticated session — that runs the OAuth exchange server-side using a dedicated identity-only OAuth App requesting only the `user:email` scope.

#### Scenario: Start redirects to GitHub authorization

- **WHEN** a guest activates GitHub sign-in and the browser requests the start endpoint for a given app (user or admin)
- **THEN** the backend redirects to the GitHub authorization URL with the sign-in OAuth App client id, the callback `<APP_URL>/auth/github/callback`, the `user:email` scope, and a signed short-lived state that carries which app to return to

#### Scenario: Callback exchanges the code and hands off a one-time code

- **WHEN** GitHub redirects back to the callback endpoint with a valid state and an authorization code
- **THEN** the backend exchanges the code for a GitHub access token, reads the account's primary verified email, and redirects the browser to the app's `/auth/github/callback` SPA route with a short-lived one-time handoff code

#### Scenario: Session exchange returns the normal token pair

- **WHEN** the SPA posts a valid handoff code to the session endpoint
- **THEN** the backend returns the normal access/refresh token pair, identical in shape to email/password login

#### Scenario: Cancelled or unverifiable attempt returns to login

- **WHEN** the user denies authorization, or the state cannot be verified
- **THEN** the callback redirects to the app login page with a GitHub error indicator and no session is created

### Requirement: GitHub Sign-In Authenticates Existing Members By Verified Email

The backend MUST establish the session from the primary verified GitHub email by matching an existing member with an active membership and reusing that member's existing Firebase UID. It MUST NOT provision new users, and MUST NOT change the database schema, the JWT contract, or use Firebase Admin.

#### Scenario: Existing member signs in

- **WHEN** the resolved primary verified GitHub email matches an existing member with an active membership
- **THEN** the backend issues the normal session for that member, reusing their existing Firebase UID

#### Scenario: Email is not a member

- **WHEN** the resolved primary verified GitHub email does not match any existing member with an active membership
- **THEN** the session exchange responds with 401 Unauthorized
- **AND** no user is created

#### Scenario: No verified primary email

- **WHEN** the GitHub account has no primary verified email
- **THEN** the callback redirects to the login page with an email error indicator and no session is created

### Requirement: GitHub Sign-In Stays Independent Of The GitHub App Integration

The sign-in OAuth App MUST be a dedicated identity-only app, separate from the GitHub App integration and `github_connections`. The CSRF state and the session handoff MUST NOT be usable as session tokens.

#### Scenario: Uses dedicated sign-in credentials

- **WHEN** the flow builds the authorization URL and exchanges the code
- **THEN** it uses the dedicated sign-in OAuth App credentials, not the GitHub App integration credentials
- **AND** it never creates a GitHub integration connection or writes to `github_connections`

#### Scenario: State and handoff cannot mint a session directly

- **WHEN** the state or handoff token is presented to a normal authenticated endpoint
- **THEN** it is rejected, because both carry a distinct purpose and omit the issuer/audience the access-token verifier requires

### Requirement: Login Pages Offer GitHub Sign-In

The user-web and admin-web login pages MUST offer a **Continue with GitHub** action that starts the backend flow, gated per environment, and a callback route that completes it.

#### Scenario: Login button starts the backend flow

- **WHEN** a guest activates **Continue with GitHub** on a login page with GitHub sign-in enabled
- **THEN** the browser navigates to the API start endpoint for that app

#### Scenario: Callback route completes sign-in

- **WHEN** the SPA `/auth/github/callback` route loads with a handoff code
- **THEN** it exchanges the code for a session and redirects to the dashboard
- **AND** an error indicator instead redirects to the login page with a message

#### Scenario: Disabled per environment

- **WHEN** GitHub sign-in is disabled for the environment
- **THEN** the **Continue with GitHub** action is not shown
