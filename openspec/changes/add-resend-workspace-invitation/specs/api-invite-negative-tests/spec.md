## ADDED Requirements

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
