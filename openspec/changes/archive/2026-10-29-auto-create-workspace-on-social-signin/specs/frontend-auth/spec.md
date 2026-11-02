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

#### Scenario: Google sign-in supplies a paired email proof
- **WHEN** Google sign-in returns an OIDC ID token beside its Firebase identity token
- **THEN** user-web and admin-web send the Google ID token only with the immediate login exchange
- **AND** they do not persist or log it or substitute an access token or profile email
- **AND** failed proof exchange clears application session state through the existing recovery path

#### Scenario: Explicit invitation acceptance forwards paired Google proof
- **WHEN** Google sign-in on the invitation page returns a Google ID token beside its Firebase ID token
- **THEN** the page forwards the optional proof to invitation acceptance before creating an application session
- **AND** the subsequent login uses the same transient credentials without storing or logging them
- **AND** invitation-first entry creates no unsolicited personal workspace

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

#### Scenario: Existing-account ownership cannot be proven
- **GIVEN** the backend rejects social sign-in because an email-only existing-account match lacks verified ownership evidence
- **WHEN** the frontend handles the failed exchange
- **THEN** it remains in a guest session and presents the existing recoverable identity-proof guidance
- **AND** it does not present the password account as authenticated or begin an extra onboarding form

## ADDED Requirements

### Requirement: Extension Interactive Sign-In Is Single-Flight
The extension MUST allow at most one interactive Google or GitHub sign-in attempt at a time. The background worker SHALL retain that shared guard across popup reopenings, explain an already active attempt, and release the guard after every terminal outcome so the user can retry.

#### Scenario: Duplicate provider attempt is rejected
- **GIVEN** an interactive Google or GitHub sign-in attempt is active
- **WHEN** the popup requests another Google or GitHub sign-in
- **THEN** the extension keeps the original attempt active
- **AND** it asks the user to finish or close the existing provider window

#### Scenario: Terminal outcome releases the guard
- **GIVEN** an interactive provider sign-in attempt is active
- **WHEN** the attempt succeeds, fails, or is cancelled
- **THEN** the background worker releases the shared guard
- **AND** a later Google or GitHub sign-in attempt can start
