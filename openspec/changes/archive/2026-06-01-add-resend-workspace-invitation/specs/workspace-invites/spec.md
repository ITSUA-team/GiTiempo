## MODIFIED Requirements

### Requirement: Admin Can Manage Workspace Invites
The system MUST allow admins to list, create, resend, and cancel workspace invites.

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

#### Scenario: Admin resends a pending invite
- **GIVEN** the requester is an admin member of the current workspace
- **AND** a pending invite exists in that workspace
- **AND** the invite has not expired by time
- **WHEN** the requester resends the invite
- **THEN** the system redelivers invite content for the same invite
- **AND** returns the existing invite response
- **AND** preserves the invite token, role, workspace, and expiration
- **AND** does not create workspace membership

#### Scenario: Admin cancels a pending invite
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester cancels a pending invite
- **THEN** the system prevents that invite from being accepted afterward

#### Scenario: Non-admin attempts invite management
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to list, create, resend, or cancel invites
- **THEN** the system rejects the request as forbidden

## ADDED Requirements

### Requirement: Invite Resend Redelivers Firebase Onboarding
The system SHALL regenerate app-targeted Firebase password setup/reset link content when resending a pending invite.

#### Scenario: Resend generates fresh setup content
- **GIVEN** a pending unexpired invite exists for an email in the current workspace
- **WHEN** an admin resends the invite
- **THEN** the system provisions or reuses the Firebase identity for the invited email
- **AND** generates fresh password setup/reset link content for that email
- **AND** redelivers invite acceptance and password setup guidance through the configured invite delivery channel

#### Scenario: Resend delivery failure keeps invite pending
- **GIVEN** a pending unexpired invite exists
- **WHEN** resend delivery or Firebase setup link generation fails
- **THEN** the system returns the delivery error to the admin
- **AND** preserves the invite as pending with the original token and expiration

### Requirement: Invite Resend Rejects Invalid Targets
The system SHALL reject resend for invites that are unavailable, non-pending, outside the current workspace, or expired by time.

#### Scenario: Resend missing invite
- **WHEN** an admin sends `POST /invites/:id/resend` for an invite id that does not exist
- **THEN** the system responds with 404 Not Found and message "Pending invite not found"

#### Scenario: Resend accepted invite
- **WHEN** an admin sends `POST /invites/:id/resend` for an invite with status "accepted"
- **THEN** the system responds with 404 Not Found and message "Pending invite not found"

#### Scenario: Resend cross-workspace invite
- **WHEN** an admin sends `POST /invites/:id/resend` for a pending invite in another workspace
- **THEN** the system responds with 404 Not Found and message "Pending invite not found"

#### Scenario: Resend expired pending invite
- **WHEN** an admin sends `POST /invites/:id/resend` for an invite with status "pending" where `expiresAt` is in the past
- **THEN** the system responds with 410 Gone and message "Invite has expired"
