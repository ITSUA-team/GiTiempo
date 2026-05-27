# Workspace Invites Specification

## Purpose

Define workspace invite creation, delivery, cancellation, and acceptance behavior for admin-managed onboarding.

## Requirements

### Requirement: Admin Can Manage Workspace Invites
The system MUST allow admins to list, create, and cancel workspace invites. Creating an invite SHALL prepare backend-provisioned Firebase onboarding and app-targeted password setup for the invited email before delivery completes.

#### Scenario: Admin lists invites
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for workspace invites
- **THEN** the system returns the invites for that workspace

#### Scenario: Admin creates an invite
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid invite request with email and role
- **THEN** the system creates a pending invite for that workspace
- **AND** prepares Firebase password setup/reset onboarding for the invited email before sending the invite message
- **AND** the password setup action link targets the User SPA and preserves invite-token return context

#### Scenario: Duplicate pending invite is rejected
- **GIVEN** the requester is an admin member of the current workspace
- **AND** a pending invite already exists for the requested email in this workspace
- **WHEN** the requester submits an invite request for that same email
- **THEN** the system rejects the request as conflicting (409)

#### Scenario: Admin cancels a pending invite
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester cancels a pending invite
- **THEN** the system prevents that invite from being accepted afterward

#### Scenario: Non-admin attempts invite management
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to list, create, or cancel invites
- **THEN** the system rejects the request as forbidden

### Requirement: Invite Acceptance Creates Membership
The system SHALL allow a pending invite to create application membership when it is accepted by the matching signed-in Firebase identity.

#### Scenario: Invited user accepts invite
- **GIVEN** a pending invite exists for an email in the current workspace
- **AND** the presented Firebase identity resolves to that same email
- **WHEN** the invite is accepted with a valid invite token and Firebase token after Firebase sign-in
- **THEN** the system creates the local user if needed
- **AND** creates the workspace membership with the invited role
- **AND** marks the invite as accepted
- **AND** returns no content

#### Scenario: Accepted invite cannot be reused
- **GIVEN** an invite has already been accepted
- **WHEN** another acceptance attempt is made with the same invite token
- **THEN** the system rejects the request

#### Scenario: Expired invite cannot be accepted
- **GIVEN** an invite has a status of pending but its `expires_at` is in the past
- **WHEN** an acceptance attempt is made with the invite token
- **THEN** the system rejects the request (410 Gone) and does not create membership

### Requirement: Invite Delivery Supports SMTP And Console Fallback
The system MUST support SMTP invite delivery and an environment-controlled console fallback mode. Console fallback mode MUST be disabled by default and MUST NOT be active in production, regardless of environment variable configuration. Delivery content SHALL include invite acceptance and app-hosted Firebase password setup/reset guidance.

#### Scenario: SMTP delivery sends invite message
- **GIVEN** SMTP delivery is configured and console fallback is disabled
- **WHEN** an admin creates an invite
- **THEN** the system sends the invite through the configured SMTP transport
- **AND** the message includes invite acceptance and app-hosted Firebase password setup/reset guidance

#### Scenario: Console fallback logs invite delivery
- **GIVEN** console fallback mode is enabled
- **AND** the application is not running in production mode
- **WHEN** an admin creates an invite
- **THEN** the system records the invite delivery in application logs instead of using SMTP
- **AND** the log entry includes invite acceptance and app-hosted password setup/reset link information for local testing

#### Scenario: Console fallback is blocked in production
- **GIVEN** the application is running in production mode
- **WHEN** an admin creates an invite
- **THEN** the system MUST use SMTP delivery regardless of the console fallback configuration value

### Requirement: Invite Creation Compensates On Delivery Failure
The system MUST cancel (expire) a pending invite when Firebase onboarding preparation or delivery fails, so that a retry creates a fresh invite.

#### Scenario: SMTP failure expires the invite
- **GIVEN** an admin creates an invite for an email
- **AND** the invite is persisted as pending
- **WHEN** the delivery transport throws an error
- **THEN** the system transitions the invite to expired status
- **AND** the system returns a delivery error to the caller

#### Scenario: Firebase onboarding preparation failure expires the invite
- **GIVEN** an admin creates an invite for an email
- **AND** the invite is persisted as pending
- **WHEN** Firebase user provisioning, action-code setting, or password setup/reset link generation throws an error
- **THEN** the system transitions the invite to expired status
- **AND** the system returns a delivery or provisioning error to the caller

#### Scenario: Retry after delivery failure succeeds
- **GIVEN** a previous invite creation failed due to delivery error and the invite was expired
- **WHEN** the admin retries the same invite creation
- **THEN** the system creates a new pending invite with a fresh token
- **AND** attempts Firebase onboarding preparation and delivery again

### Requirement: Invite Acceptance Requires Signed-In Firebase Token
The system MUST require invite acceptance to use a Firebase ID token from a completed Firebase sign-in rather than a browser-created account credential payload.

#### Scenario: Invite accepted after email password sign-in
- **GIVEN** an invitee has set a password through the app-hosted Firebase password setup route
- **AND** the invitee signs in with Firebase email/password for the invited email
- **WHEN** the invitee submits the invite token and Firebase ID token to `POST /invites/accept`
- **THEN** the system verifies the token and applies the existing invite acceptance rules

#### Scenario: Invite accepted after Google sign-in
- **GIVEN** an invitee signs in with Google through Firebase
- **AND** the Firebase identity email matches the invited email
- **WHEN** the invitee submits the invite token and Firebase ID token to `POST /invites/accept`
- **THEN** the system verifies the token and applies the existing invite acceptance rules
