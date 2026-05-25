## ADDED Requirements

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
