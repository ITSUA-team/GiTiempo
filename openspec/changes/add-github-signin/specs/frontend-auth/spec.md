## MODIFIED Requirements

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

#### Scenario: GitHub login succeeds

- **WHEN** the user successfully authenticates with GitHub through Firebase Auth and the backend token exchange succeeds
- **THEN** the frontend stores the new access token in session state
- **AND** the frontend persists the rotated refresh token for later restoration
- **AND** the frontend resolves the authenticated user profile for the active session

#### Scenario: GitHub login links an existing account before exchange

- **GIVEN** GitHub sign-in reports that the email already has a different sign-in method
- **WHEN** the frontend completes the existing-account linking recovery so a single Firebase identity token is available
- **THEN** the frontend exchanges that identity token and enters the authenticated state as for any other provider
- **AND** a cancelled or failed recovery leaves the frontend in a guest session state with no stale access or refresh tokens

#### Scenario: Login exchange fails

- **WHEN** the user-web auth flow receives a failing login result from the identity provider or backend exchange
- **THEN** the frontend remains in a guest session state
- **AND** the frontend does not keep stale access or refresh tokens from the failed attempt

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

#### Scenario: GitHub invite acceptance succeeds

- **GIVEN** the invite accept page is opened with a valid invite token
- **WHEN** the invitee signs in with GitHub and Firebase returns an identity token whose email exactly matches the invited email
- **THEN** the page submits `POST /invites/accept` with the invite token and Firebase ID token
- **AND** after success the page creates the normal app API session with the same Firebase identity token
- **AND** the page redirects to the dashboard

#### Scenario: GitHub invite email does not match the invite

- **GIVEN** the invite accept page is opened with a valid invite token
- **WHEN** the invitee signs in with GitHub and submits acceptance, and the backend rejects it because the resolved identity email does not match the invited email
- **THEN** the page keeps the recovery state and surfaces the email-mismatch guidance
- **AND** the page signs the GitHub identity provider out and does not create an app session

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

- **WHEN** a user-web login attempt starts with email/password, Google, or GitHub sign-in
- **THEN** the submitting state stays active while Firebase sign-in is still in progress
- **AND** the login UI does not allow a second submission during that interval

#### Scenario: GitHub login stays single-flight through existing-account linking

- **GIVEN** a GitHub login attempt triggers the existing-account linking recovery
- **WHEN** the recovery authenticates with the existing method and links the pending GitHub credential
- **THEN** the submitting state stays active across the recovery until a single identity token resolves or the attempt fails
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
