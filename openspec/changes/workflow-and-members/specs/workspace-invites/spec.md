## ADDED Requirements

### Requirement: Admin Can Manage Workspace Invites
The system MUST allow admins to list, create, and cancel workspace invites.

#### Scenario: Admin lists invites
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for workspace invites
- **THEN** the system returns the invites for that workspace

#### Scenario: Admin creates an invite
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid invite request with email and role
- **THEN** the system creates a pending invite for that workspace

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
The system SHALL allow a pending invite to create application membership when it is accepted by the matching Firebase identity.

#### Scenario: Invited user accepts invite
- **GIVEN** a pending invite exists for an email in the current workspace
- **AND** the presented Firebase identity resolves to that same email
- **WHEN** the invite is accepted with a valid invite token and Firebase token
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

### Requirement: Invite Acceptance Requires Strict Email Match
The system MUST require the invite email and accepted Firebase identity email to match exactly after normalization.

#### Scenario: Invite email mismatch is rejected
- **GIVEN** a valid invite token exists for one email address
- **WHEN** the invite is accepted using a Firebase identity for a different email address
- **THEN** the system rejects the request and does not create membership

### Requirement: Invite Delivery Supports SMTP And Console Fallback
The system MUST support SMTP invite delivery and an environment-controlled console fallback mode.

#### Scenario: SMTP delivery sends invite message
- **GIVEN** SMTP delivery is configured and console fallback is disabled
- **WHEN** an admin creates an invite
- **THEN** the system sends the invite through the configured SMTP transport

#### Scenario: Console fallback logs invite delivery
- **GIVEN** console fallback mode is enabled
- **WHEN** an admin creates an invite
- **THEN** the system records the invite delivery in application logs instead of using SMTP
