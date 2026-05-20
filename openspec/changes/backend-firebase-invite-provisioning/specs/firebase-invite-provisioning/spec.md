## ADDED Requirements

### Requirement: Backend Provisions Invited Firebase Identity
The system SHALL provision or reuse the invited email's Firebase identity through a backend Firebase Admin capability before an invite email is delivered.

#### Scenario: Invitee has no Firebase user
- **GIVEN** an admin creates an invite for an email that has no Firebase user
- **WHEN** the system prepares invite delivery
- **THEN** the system creates a Firebase user for the invited email without receiving or storing a password
- **AND** the system generates a Firebase password setup/reset link for that email

#### Scenario: Invitee already has a Firebase user
- **GIVEN** an admin creates an invite for an email that already has a Firebase user
- **WHEN** the system prepares invite delivery
- **THEN** the system reuses the existing Firebase user for that email
- **AND** the system generates a Firebase password setup/reset link or equivalent sign-in guidance for that email

### Requirement: Password Setup Avoids Application Password Handling
The system MUST NOT accept, log, persist, or forward raw invitee passwords through GiTiempo APIs or database records during invite onboarding.

#### Scenario: First-time invitee sets a password
- **GIVEN** a first-time email/password invitee receives an invite email
- **WHEN** the invitee needs to set a password
- **THEN** the invitee uses a Firebase-hosted password setup/reset flow
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
The system SHALL send invite delivery content that tells first-time invitees how to set a Firebase password and how to return to accept the workspace invite.

#### Scenario: Invite email is delivered
- **GIVEN** Firebase provisioning and password setup/reset link generation succeeded
- **WHEN** the system sends the invite email
- **THEN** the message includes the invite accept URL
- **AND** the message includes password setup/reset guidance for the invited email
- **AND** the message explains that workspace access is created only after signing in and accepting the invite

#### Scenario: Console fallback logs invite delivery
- **GIVEN** console fallback mode is enabled outside production
- **WHEN** the system records invite delivery in application logs
- **THEN** the log entry includes the invite accept URL
- **AND** the log entry includes password setup/reset link information needed for local testing
