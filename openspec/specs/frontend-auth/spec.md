# Frontend Authentication Specification

## Purpose

Define user-web authentication behavior for login exchange handling, session restoration, route guarding, and logout cleanup.
## Requirements
### Requirement: Frontend Login Exchange Behavior

The user-web frontend MUST authenticate through Firebase Auth and normalize both successful and failed backend token exchanges through its auth session layer so the application enters the correct authenticated or guest state after a login action.

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

### Requirement: Frontend Session Bootstrap Restoration

The user-web frontend MUST normalize application startup based on the persisted refresh token state before protected-route navigation is treated as final.

#### Scenario: Stored refresh token restores the session

- **WHEN** application bootstrap begins with a valid persisted refresh token
- **THEN** the frontend restores an authenticated session from the refresh flow
- **AND** the frontend replaces the persisted refresh token with the rotated value returned by the backend
- **AND** the bootstrap state completes as authenticated
- **AND** protected-route navigation resolves only after session normalization completes

#### Scenario: Refresh token is missing or invalid

- **WHEN** application bootstrap begins without a usable persisted refresh token or with an invalid or rejected persisted refresh token
- **THEN** the frontend clears the unusable persisted refresh token when one exists
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

### Requirement: Frontend Active Workspace Switch Session Handling

The web frontends MUST switch active workspace context through the shared auth session layer by replacing the current token pair and refreshing authenticated session data.

#### Scenario: Workspace switch replaces local session tokens

- **GIVEN** an authenticated web session has loaded another available workspace membership
- **WHEN** the user selects that workspace and the switch API returns a token pair
- **THEN** the frontend replaces the in-memory access token with the returned access token
- **AND** the frontend replaces the persisted refresh token with the returned refresh token
- **AND** stale workspace-scoped server state is cleared before reloading shell data

#### Scenario: Workspace switch reloads current user and workspace data

- **GIVEN** a workspace switch has succeeded
- **WHEN** the frontend resumes authenticated rendering
- **THEN** the frontend reloads the current user profile for the selected workspace role
- **AND** the frontend reloads the active workspace identity
- **AND** the visible shell workspace label reflects the selected workspace

#### Scenario: Workspace switch failure preserves current session

- **GIVEN** an authenticated user attempts to switch workspaces
- **WHEN** the switch API rejects the request or the request fails
- **THEN** the frontend keeps the existing access token and refresh token
- **AND** the frontend keeps the current workspace context active
- **AND** the frontend surfaces retryable feedback without signing the user out

#### Scenario: Admin app redirects after selecting non-admin workspace role

- **GIVEN** an authenticated admin-web user switches to a workspace where their role cannot access admin routes
- **WHEN** the switch succeeds
- **THEN** admin-web redirects the user to the accessible user-web dashboard for the selected workspace context

#### Scenario: User app remains in user app after switch

- **GIVEN** an authenticated user-web user switches to another accessible workspace
- **WHEN** the switch succeeds
- **THEN** user-web keeps the user in user-web
- **AND** user-web reloads the current authenticated route or falls back to the user dashboard when the route is no longer valid

### Requirement: Frontend Logout Cleanup

The user-web frontend MUST clear local session state during logout even if the backend logout request fails, so the browser returns to a consistent guest state.

#### Scenario: Logout completes successfully

- **WHEN** an authenticated user logs out and the backend accepts the logout request
- **THEN** the frontend clears the access token from session state
- **AND** the frontend clears the persisted refresh token
- **AND** the frontend returns the app to guest behavior on the login route

#### Scenario: Logout API request fails

- **WHEN** an authenticated user logs out and the backend logout request fails
- **THEN** the frontend still clears the local access token from session state
- **AND** the frontend still clears the persisted refresh token
- **AND** the frontend returns the app to guest behavior on the login route

#### Scenario: Session restoration can no longer succeed

- **WHEN** the frontend determines that session restoration or refresh can no longer succeed
- **THEN** the frontend clears any stored session tokens
- **AND** the frontend treats the browser session as anonymous

### Requirement: Invite Password Setup Uses Firebase Action Codes
The user-web invite password setup page MUST handle Firebase password setup/reset action links in app UI while keeping raw passwords out of GiTiempo APIs.

#### Scenario: Password setup link is valid
- **GIVEN** the invitee opens the User SPA password setup route from an invite email Firebase action link
- **AND** the link contains a valid Firebase password reset `oobCode`
- **WHEN** the page verifies the action code
- **THEN** it shows the invited email and a password setup form with New password and Confirm password fields
- **AND** it preserves the invite token from the action link return context

#### Scenario: Password setup succeeds
- **GIVEN** the password setup page has verified the action code
- **WHEN** the invitee submits a valid matching password and confirmation
- **THEN** the page confirms the new password directly with Firebase Auth
- **AND** the page does not send the raw password to GiTiempo APIs
- **AND** the page shows success copy and returns the invitee to `/invites/accept?token=<token>`

#### Scenario: Password setup link is invalid or expired
- **GIVEN** the invitee opens the User SPA password setup route with a missing, invalid, expired, or already-used action code
- **WHEN** the page attempts to verify the action code
- **THEN** it shows the invalid-link state instead of the password form
- **AND** it offers a primary action back to the invite when token context exists or to login otherwise

#### Scenario: Password setup validation fails
- **GIVEN** the password setup page has verified the action code
- **WHEN** Firebase rejects the reset confirmation or the local confirmation does not match
- **THEN** the page keeps the form visible
- **AND** it maps weak password, mismatched confirmation, too many requests, network failure, and expired action-code errors inline

### Requirement: Invite Accept Uses Sign-In Based Acceptance
The user-web invite accept page MUST authenticate invited users through Firebase sign-in before accepting the invite, and MUST NOT create Firebase email/password accounts in the browser for invite onboarding.

#### Scenario: Email password invite acceptance succeeds
- **GIVEN** the invite accept page is opened with a valid invite token
- **AND** the invitee has set a password through the app-hosted Firebase password setup route opened from the invite email
- **WHEN** the invitee signs in with the invited email and password
- **THEN** the page submits `POST /invites/accept` with the invite token and Firebase ID token
- **AND** after success the page creates the normal app API session with the same Firebase identity token
- **AND** the page redirects to the dashboard

#### Scenario: Google invite acceptance succeeds
- **GIVEN** the invite accept page is opened with a valid invite token
- **WHEN** the invitee signs in with Google and Firebase returns an identity token for the invited email
- **THEN** the page submits `POST /invites/accept` with the invite token and Firebase ID token
- **AND** after success the page creates the normal app API session with the same Firebase identity token
- **AND** the page redirects to the dashboard

#### Scenario: Existing app session opens invite accept route
- **GIVEN** the browser already has an authenticated GiTiempo app session
- **WHEN** the invitee opens `/invites/accept?token=<token>`
- **THEN** the router keeps the invitee on the invite accept page instead of redirecting to the dashboard
- **AND** the invitee can continue the sign-in based invite acceptance flow for the invited Firebase identity

#### Scenario: Browser account creation is unavailable
- **GIVEN** the invite accept page is opened with a valid invite token
- **WHEN** the page renders the default form
- **THEN** the form contains Email and Password fields only
- **AND** the primary action is `Accept invite`
- **AND** the page does not render a Confirm password field
- **AND** the page does not call Firebase browser account creation for invite onboarding

#### Scenario: Invitee needs password setup
- **GIVEN** the invite accept page is opened with a valid invite token
- **WHEN** the invitee cannot sign in because no password has been set
- **THEN** the page shows inline guidance to use the password setup link from the invite email or ask an admin to cancel the stale invite and send a fresh one
- **AND** the page preserves the invite token state

#### Scenario: Sign-in succeeds but invite acceptance fails
- **GIVEN** Firebase sign-in succeeds on the invite accept page
- **WHEN** `POST /invites/accept` fails
- **THEN** the page keeps a recovery state explaining that the Firebase account is signed in but workspace access was not created
- **AND** the page offers the correct next action for retryable, email mismatch, terminal invite, and already-member failures

#### Scenario: Invite acceptance succeeds but app sign-in fails
- **GIVEN** `POST /invites/accept` succeeds for the presented invite token and Firebase identity
- **WHEN** the follow-up normal app API session creation fails
- **THEN** the page clears any partial local app session state
- **AND** the recovery state explains that workspace access was created but app sign-in did not complete
- **AND** the page offers a next action to sign in again without implying that the access pre-existed

### Requirement: Auth Submission State Covers The Full Sign-In Attempt
The user-web auth session layer MUST keep sign-in actions in a submitting state until the identity-provider step and the follow-up app-session exchange have both resolved or failed, so the UI stays single-flight during login.

#### Scenario: Standard login remains single-flight during provider sign-in
- **WHEN** a user-web login attempt starts with email/password or Google sign-in
- **THEN** the submitting state stays active while Firebase sign-in is still in progress
- **AND** the login UI does not allow a second submission during that interval

#### Scenario: Standard login remains single-flight during backend exchange
- **GIVEN** Firebase sign-in has already returned an identity token
- **WHEN** the normal app API session exchange is still in progress
- **THEN** the submitting state stays active until the exchange resolves or fails
- **AND** a failed attempt still clears stale local session tokens before returning the UI to guest state

#### Scenario: Invite token is missing
- **GIVEN** the invite accept page is opened without a token query parameter
- **WHEN** the page renders
- **THEN** it shows the invalid-link state instead of the sign-in form
- **AND** it offers a primary action to go to the login page

### Requirement: Register Route Is A Standalone Guest Flow
The user-web frontend SHALL provide `/register` as a standalone unauthenticated route-level page for first-workspace-owner registration after backend registration support exists.

#### Scenario: Anonymous user opens register route
- **WHEN** an anonymous user navigates to `/register`
- **THEN** the frontend renders the register page outside the authenticated app shell
- **AND** the page does not render the sidebar, top-bar timer surface, or in-shell workspace navigation

#### Scenario: Authenticated user opens register route
- **GIVEN** the browser already has an authenticated GiTiempo app session
- **WHEN** the user navigates to `/register`
- **THEN** the router redirects to the default authenticated route or preserved redirect target

### Requirement: Login Page Links To Registration
The user-web login page SHALL expose the approved secondary registration entry point without changing login form state.

#### Scenario: Create workspace action opens register flow
- **WHEN** the login page renders
- **THEN** it shows a secondary outlined `Create workspace` action below `Continue with Google`
- **AND** the action navigates to `/register`
- **AND** the action is visually secondary to both sign-in actions

#### Scenario: Login errors stay scoped to login
- **GIVEN** a login attempt has failed
- **WHEN** the user navigates from `/login` to `/register`
- **THEN** the register page does not display the stale login error

### Requirement: Register Page Matches Approved Workflow
The user-web register page MUST follow the approved docs and `.pen` screens for content hierarchy, fields, actions, and responsive structure.

#### Scenario: Register form renders default fields
- **WHEN** the register page renders
- **THEN** the form fields are ordered `Work email`, `Full name`, `Workspace name`, `Password`, then `Confirm password`
- **AND** the owner acknowledgement checkbox follows the password fields
- **AND** the primary action is `Create workspace`
- **AND** the secondary account action is an inline `Sign in` link to `/login`

#### Scenario: Register form validates before submit
- **GIVEN** required fields are blank, password confirmation does not match, or owner acknowledgement is unchecked
- **WHEN** the user submits the register form
- **THEN** the frontend shows inline validation
- **AND** no registration API request is sent

#### Scenario: Register page excludes unapproved account actions
- **WHEN** the register page renders
- **THEN** it does not show Google sign-up, invite acceptance, or password setup actions

### Requirement: Register Submission Establishes Session
The user-web frontend MUST submit registration through a typed shared-contract client and enter the normal authenticated session after success.

#### Scenario: Registration succeeds
- **GIVEN** the user submits a valid register form
- **AND** the registration endpoint returns the normal token pair
- **WHEN** the frontend handles the response
- **THEN** it stores the access token in session state
- **AND** persists the refresh token for later restoration
- **AND** redirects to the dashboard

#### Scenario: Registration submit remains single-flight
- **GIVEN** a registration request is in progress
- **WHEN** the user interacts with the register form
- **THEN** the `Create workspace` action shows loading
- **AND** duplicate submissions are prevented
- **AND** the panel shape remains stable

#### Scenario: Registration failure is mapped
- **GIVEN** registration fails with a known registration error
- **WHEN** the frontend handles the failure
- **THEN** the page shows inline error feedback in the register panel
- **AND** also uses toast feedback for the failed submission
- **AND** the user remains on `/register`
