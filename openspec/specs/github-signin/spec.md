# GitHub Sign-In Specification

## Purpose

Define the backend login-scoped GitHub OAuth flow — start, callback, and session — that authenticates an existing member by their primary verified email and issues the normal session, staying independent of the GitHub App integration and its connections.

## Requirements

### Requirement: Backend Login-Scoped GitHub OAuth Flow

The backend MUST provide a login-scoped GitHub OAuth flow — a start, a callback, and a session-exchange endpoint, none requiring an authenticated session — that runs the OAuth exchange server-side using a dedicated identity-only OAuth App requesting only the `user:email` scope.

#### Scenario: Start redirects to GitHub authorization

- **WHEN** a guest activates GitHub sign-in and the browser requests the start endpoint for a given app (user or admin)
- **THEN** the backend redirects to the GitHub authorization URL with the sign-in OAuth App client id, the callback `<APP_URL>/auth/github/callback`, the `user:email` scope, and a signed short-lived state that carries which app to return to
- **AND** it binds the transaction to the initiating browser, so a state authorized in one browser cannot complete sign-in in another

#### Scenario: Callback exchanges the code and hands off a one-time code

- **WHEN** GitHub redirects back to the callback endpoint with a valid state and an authorization code
- **THEN** the backend exchanges the code for a GitHub access token, reads the account's primary verified email, and redirects the browser to the app's `/auth/github/callback` SPA route with a short-lived one-time handoff code
- **AND** the handoff code is opaque and carries no account data, so the resolved email never appears in the redirect URL

#### Scenario: Session exchange returns the normal token pair

- **WHEN** the SPA posts a valid handoff code to the session endpoint
- **THEN** the backend returns the normal access/refresh token pair, identical in shape to email/password login

#### Scenario: Cancelled or unverifiable attempt returns to login

- **WHEN** the user denies authorization, or the state cannot be verified as issued by the backend to the browser presenting it
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

- **WHEN** the state or the handoff code is presented to a normal authenticated endpoint
- **THEN** it is rejected — the state carries a distinct purpose and omits the issuer/audience the access-token verifier requires, and the handoff is an opaque code with no claims to verify at all

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

### Requirement: Extension GitHub Sign-In Returns Through A Configured Extension Destination
The backend GitHub sign-in flow SHALL accept an extension login target, and for that target SHALL return the browser to a redirect destination read from backend configuration on every outcome. It MUST NOT take that destination from the request, and MUST fail closed when the destination is not configured.

#### Scenario: Extension target starts the flow
- **GIVEN** GitHub sign-in and an extension redirect destination are configured for the backend
- **WHEN** the browser requests the start endpoint for the extension target
- **THEN** the backend redirects to GitHub authorization exactly as it does for the web targets
- **AND** the signed state records that the extension started the flow

#### Scenario: Success returns the handoff code to the extension
- **GIVEN** an extension-initiated flow returns from GitHub with a verifiable state and an authorization code
- **WHEN** the backend resolves the primary verified email
- **THEN** it redirects the browser to the configured extension destination carrying a one-time handoff code
- **AND** it does not redirect to a web app route

#### Scenario: Failure returns to the extension rather than a web login page
- **GIVEN** an extension-initiated flow
- **WHEN** the user denies authorization, the state cannot be verified, no verified primary email exists, or the code exchange fails
- **THEN** the backend redirects the browser to the configured extension destination carrying an error indicator
- **AND** it does not redirect to a web app login page, so the extension's authorization window always reaches a destination it can observe

#### Scenario: Redirect destination is never taken from the request
- **GIVEN** a request to the start endpoint supplies its own candidate redirect destination
- **WHEN** the backend builds the extension flow
- **THEN** it uses only the configured destination
- **AND** a handoff code is never delivered to a destination named by the caller

#### Scenario: Unrecognized login target falls back to the user app
- **GIVEN** a request to the start endpoint names a login target the backend does not recognize
- **WHEN** the backend resolves which app to return to
- **THEN** it treats the flow as a user-app flow
- **AND** it does not deliver the outcome to the extension destination

#### Scenario: Unconfigured extension destination fails closed
- **GIVEN** the backend has no extension redirect destination configured
- **WHEN** an extension-target flow is attempted
- **THEN** the backend reports the flow as unavailable
- **AND** no partial or defaulted destination is used

### Requirement: Extension Session Establishment Is Bound To Its Initiator
For the extension login target, the backend SHALL accept a handoff code only for a transaction it can attribute to the client that started it, by proof of possession at the session exchange rather than by the cookie the web targets use, since the extension's authorization window does not carry that cookie to the callback. It MUST refuse to start an extension transaction that could not be bound this way.

#### Scenario: A transaction started elsewhere cannot establish an extension session
- **GIVEN** a GitHub authorization completed for a transaction that a different client started
- **WHEN** that transaction's outcome is presented in order to establish an extension session
- **THEN** the session exchange refuses to establish the session, because the presenting client cannot prove possession of the secret the transaction was bound to
- **AND** no session is established for the client that presented it

#### Scenario: Establishing the session requires the initiator's secret
- **GIVEN** a handoff code issued to the extension for a transaction bound to a secret
- **WHEN** the code is presented to the session endpoint without that secret, or with one that does not match
- **THEN** the exchange is refused
- **AND** the code is consumed, so a mismatched attempt cannot be followed by another guess

#### Scenario: An unbindable extension transaction never starts
- **GIVEN** a request for the extension target that carries no usable binding secret
- **WHEN** the backend handles the start endpoint
- **THEN** it refuses the request before the browser leaves for GitHub
- **AND** no state is minted, so an unbound extension transaction cannot exist

#### Scenario: Web sign-in keeps its own binding
- **GIVEN** a handoff code issued to a web target, whose transaction is bound by the callback cookie instead
- **WHEN** the code is presented to the session endpoint without a proof-of-possession secret
- **THEN** the exchange succeeds
- **AND** the extension's binding is not imposed on clients that are already bound another way

#### Scenario: Single use survives across sign-in surfaces
- **GIVEN** a handoff code issued to the extension
- **WHEN** it is presented to the session endpoint a second time, from any client
- **THEN** the second attempt is rejected
- **AND** no second session is established
