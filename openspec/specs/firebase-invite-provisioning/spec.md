# firebase-invite-provisioning Specification

## Purpose
TBD - created by archiving change backend-firebase-invite-provisioning. Update Purpose after archive.
## Requirements
### Requirement: Backend Provisions Invited Firebase Identity
The system SHALL provision or reuse the invited email's Firebase identity through a backend Firebase Admin capability before an invite email is delivered.

#### Scenario: Invitee has no Firebase user
- **GIVEN** an admin creates an invite for an email that has no Firebase user
- **WHEN** the system prepares invite delivery
- **THEN** the system creates a Firebase user for the invited email without receiving or storing a password
- **AND** the system generates Firebase password setup/reset action parameters for that email
- **AND** the delivered password setup URL opens the User SPA password setup page while preserving those Firebase action parameters
- **AND** the action link preserves the invite token as return context

#### Scenario: Invitee already has a Firebase user
- **GIVEN** an admin creates an invite for an email that already has a Firebase user
- **WHEN** the system prepares invite delivery
- **THEN** the system reuses the existing Firebase user for that email
- **AND** the system generates a Firebase password setup/reset action link or equivalent sign-in guidance for that email

#### Scenario: Concurrent provisioning creates the Firebase user first
- **GIVEN** an admin creates an invite for an email that initially has no Firebase user
- **AND** another invite flow creates the Firebase user after the system checks for the user but before create completes
- **WHEN** Firebase reports that the email already exists during create
- **THEN** the system re-reads the Firebase user by email
- **AND** reuses that Firebase user for invite onboarding instead of failing the invite

### Requirement: Password Setup Avoids Application Password Handling
The system MUST NOT accept, log, persist, or forward raw invitee passwords through GiTiempo APIs or database records during invite onboarding.

#### Scenario: First-time invitee sets a password
- **GIVEN** a first-time email/password invitee receives an invite email
- **WHEN** the invitee needs to set a password
- **THEN** the invitee uses the app-hosted User SPA password setup page opened from the Firebase action link
- **AND** the User SPA confirms the new password directly with Firebase Auth
- **AND** GiTiempo APIs never receive the raw password

### Requirement: Provisioning Failure Cancels Pending Invite
The system SHALL treat Firebase provisioning or password setup/reset link generation failure as invite delivery failure.

#### Scenario: Firebase provisioning fails during invite creation
- **GIVEN** an admin creates an invite and the pending invite is persisted
- **WHEN** Firebase provisioning or password setup/reset link generation fails before delivery completes
- **THEN** the system transitions the pending invite to expired status
- **AND** the invite creation request fails with a delivery/provisioning error

#### Scenario: Admin retries after provisioning failure
- **GIVEN** a previous invite creation failed because Firebase provisioning or password setup/reset link generation failed
- **WHEN** the admin retries creating the invite for the same email and role
- **THEN** the system creates a new pending invite with a fresh token
- **AND** the system attempts Firebase provisioning and invite delivery again

### Requirement: Invite Email Includes Setup And Acceptance Guidance
The system SHALL send invite delivery content that tells first-time invitees how to set a Firebase password in the User SPA and how to return to accept the workspace invite.

#### Scenario: Invite email is delivered
- **GIVEN** Firebase provisioning and password setup/reset link generation succeeded
- **WHEN** the system sends the invite email
- **THEN** the message includes the invite accept URL
- **AND** the message includes an app-targeted Firebase password setup/reset action link for the invited email
- **AND** the message explains that workspace access is created only after signing in and accepting the invite

#### Scenario: Console fallback logs invite delivery
- **GIVEN** console fallback mode is enabled outside production
- **WHEN** the system records invite delivery in application logs
- **THEN** the log entry includes redacted invite and password-setup URL details
- **AND** the log entry does not expose raw invite tokens, Firebase `oobCode` values, or nested `continueUrl` query values

#### Scenario: Local debug console fallback shows full links
- **GIVEN** console fallback mode is enabled outside production
- **AND** an explicit local debug flag for invite email secrets is enabled
- **WHEN** the system records invite delivery in application logs for manual local testing
- **THEN** the log entry may include full invite and password-setup URLs
- **AND** this exception MUST NOT be available in production

### Requirement: Password Setup Link Preserves Invite Context
The system SHALL configure Firebase password setup/reset action links so the invitee can return to the same invite after setting a password.

#### Scenario: Action link returns to invite acceptance
- **GIVEN** an admin creates an invite for a first-time email/password user
- **WHEN** the system generates the Firebase password setup/reset action link
- **THEN** the delivered password setup URL opens the User SPA password setup route
- **AND** the app-hosted URL forwards only the Firebase action parameters required by the User SPA password setup page plus the invite return context, rather than mirroring arbitrary Firebase-link query parameters
- **AND** the action link includes return context for `/invites/accept?token=<token>`
- **AND** completing password setup returns the invitee to the invite accept page with the original token

### Requirement: Provisioned Firebase Identity May Exist Before Membership
The system SHALL treat a provisioned Firebase identity as separate from GiTiempo workspace access until invite acceptance creates local membership.

#### Scenario: Invite delivery fails after Firebase provisioning
- **GIVEN** the system has provisioned or reused a Firebase identity for the invited email
- **AND** invite delivery later fails and the pending invite is expired
- **WHEN** no local user or membership has been created yet
- **THEN** the Firebase identity may remain provisioned for later reuse
- **AND** the invitee still cannot access GiTiempo until `POST /invites/accept` creates local membership
