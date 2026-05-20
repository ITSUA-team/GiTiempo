## ADDED Requirements

### Requirement: Invite Accept Uses Sign-In Based Acceptance
The user-web invite accept page MUST authenticate invited users through Firebase sign-in before accepting the invite, and MUST NOT create Firebase email/password accounts in the browser for invite onboarding.

#### Scenario: Email password invite acceptance succeeds
- **GIVEN** the invite accept page is opened with a valid invite token
- **AND** the invitee has set a password through the invite email's Firebase password setup/reset link
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
- **THEN** the page shows inline guidance to use the password setup/reset link from the invite email or ask an admin to resend the invite
- **AND** the page preserves the invite token state

#### Scenario: Sign-in succeeds but invite acceptance fails
- **GIVEN** Firebase sign-in succeeds on the invite accept page
- **WHEN** `POST /invites/accept` fails
- **THEN** the page keeps a recovery state explaining that the Firebase account is signed in but workspace access was not created
- **AND** the page offers the correct next action for retryable, email mismatch, terminal invite, and already-member failures

#### Scenario: Invite token is missing
- **GIVEN** the invite accept page is opened without a token query parameter
- **WHEN** the page renders
- **THEN** it shows the invalid-link state instead of the sign-in form
- **AND** it offers a primary action to go to the login page
