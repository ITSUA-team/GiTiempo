# API Invite Negative Tests Specification

## Purpose

Define backend e2e coverage expectations for invite failure paths and membership-creation safeguards.
## Requirements
### Requirement: Duplicate pending invite rejected with 409
The system SHALL reject creation of a second pending invite for the same email in the same workspace.

#### Scenario: Create duplicate pending invite
- **WHEN** an admin creates an invite for email X in workspace W, then creates another invite for the same email X in workspace W
- **THEN** the first request returns 201, the second returns 409 Conflict with message "Pending invite already exists"

### Requirement: Invite cancellation rejects non-pending or non-existent invites with 404
The system SHALL reject cancellation of invites that are not in pending status or do not exist.

#### Scenario: Cancel non-existent invite
- **WHEN** an admin sends DELETE /invites/:id with a UUID that does not match any invite
- **THEN** the system responds with 404 Not Found with message "Pending invite not found"

#### Scenario: Cancel already-accepted invite
- **WHEN** an admin sends DELETE /invites/:id for an invite with status "accepted"
- **THEN** the system responds with 404 Not Found with message "Pending invite not found"

### Requirement: Accept invite with bad token returns 404
The system SHALL reject invite acceptance when the token does not match any invite.

#### Scenario: Accept with non-existent token
- **WHEN** a user sends POST /invites/accept with a token that does not match any invite row
- **THEN** the system responds with 404 Not Found with message "Invite not found"

### Requirement: Expired invite acceptance rejected with 410
The system SHALL reject acceptance of an invite whose expiresAt is in the past.

#### Scenario: Accept expired invite
- **WHEN** a user sends POST /invites/accept with a token for an invite where expiresAt < now
- **THEN** the system responds with 410 Gone with message "Invite has expired"

### Requirement: Already-accepted invite reuse rejected with 409
The system SHALL reject re-acceptance of an invite that has already been accepted.

#### Scenario: Re-accept accepted invite
- **WHEN** a user accepts an invite (200), then attempts to accept the same invite again
- **THEN** the second request returns 409 Conflict with message "Invite cannot be accepted"

### Requirement: Email mismatch during acceptance rejected with 403
The system SHALL reject invite acceptance when the Firebase identity email does not match the invited email.

#### Scenario: Accept with wrong email identity
- **WHEN** an invite exists for email "target@example.com" and a user authenticates via Firebase with email "other@example.com" and submits POST /invites/accept
- **THEN** the system responds with 403 Forbidden with message "Invite email does not match identity"

### Requirement: Already-member rejection with 409
The system SHALL reject invite acceptance when the accepting user is already a member of the target workspace.

#### Scenario: Accept invite for already-member user
- **WHEN** an invite exists for a user who already has a workspace_members row in the target workspace and the user submits POST /invites/accept
- **THEN** the system responds with 409 Conflict with message "User is already a workspace member"

### Requirement: No membership created on invite acceptance failure
The system SHALL NOT create a workspace_members row when invite acceptance fails for any reason.

#### Scenario: No membership row after expired invite rejection
- **WHEN** a user attempts to accept an expired invite and receives 410
- **THEN** the workspace_members count for the workspace remains unchanged

#### Scenario: No membership row after email mismatch rejection
- **WHEN** a user attempts to accept an invite with mismatched email and receives 403
- **THEN** the workspace_members count for the workspace remains unchanged

#### Scenario: No membership row after already-member rejection
- **WHEN** a user attempts to accept an invite for a workspace they already belong to and receives 409
- **THEN** no additional workspace_members row is created

### Requirement: Invite validation rejects invalid input with 400
The system SHALL reject invite creation with invalid request bodies.

#### Scenario: Create invite with invalid email
- **WHEN** an admin sends POST /invites with body `{ "email": "not-an-email", "role": "member" }`
- **THEN** the system responds with 400 BadRequest

#### Scenario: Create invite with invalid role
- **WHEN** an admin sends POST /invites with body `{ "email": "user@example.com", "role": "superadmin" }`
- **THEN** the system responds with 400 BadRequest

#### Scenario: Create invite with extra fields
- **WHEN** an admin sends POST /invites with body `{ "email": "user@example.com", "role": "member", "extra": true }`
- **THEN** the system responds with 400 BadRequest (strict schema)

### Requirement: Invite resend rejects non-pending or non-existent invites with 404
The system SHALL reject resend for invites that are not in pending status, do not exist, or do not belong to the requester workspace.

#### Scenario: Resend non-existent invite
- **WHEN** an admin sends POST /invites/:id/resend with a UUID that does not match any invite
- **THEN** the system responds with 404 Not Found with message "Pending invite not found"

#### Scenario: Resend already-accepted invite
- **WHEN** an admin sends POST /invites/:id/resend for an invite with status "accepted"
- **THEN** the system responds with 404 Not Found with message "Pending invite not found"

#### Scenario: Resend cross-workspace invite
- **WHEN** an admin sends POST /invites/:id/resend for a pending invite that belongs to another workspace
- **THEN** the system responds with 404 Not Found with message "Pending invite not found"

### Requirement: Invite resend rejects expired pending invites with 410
The system SHALL reject resend for a pending invite whose `expiresAt` is in the past.

#### Scenario: Resend expired pending invite
- **WHEN** an admin sends POST /invites/:id/resend for an invite with status "pending" and expiresAt < now
- **THEN** the system responds with 410 Gone with message "Invite has expired"

### Requirement: Invite resend failure does not create membership
The system SHALL NOT create a workspace_members row when invite resend fails for any reason.

#### Scenario: No membership row after expired resend rejection
- **WHEN** an admin attempts to resend an expired pending invite and receives 410
- **THEN** the workspace_members count for the workspace remains unchanged

#### Scenario: No membership row after resend delivery failure
- **WHEN** an admin attempts to resend a pending invite and delivery fails
- **THEN** the workspace_members count for the workspace remains unchanged
