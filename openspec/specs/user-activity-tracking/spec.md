## Requirements

### Requirement: Time-Tracking Writes Update User Last-Activity Timestamp
The system SHALL update the authenticated user's last-activity timestamp whenever a time-tracking write operation completes successfully.

#### Scenario: Timer start updates last activity
- **GIVEN** an authenticated workspace member
- **WHEN** the member starts a timer
- **THEN** the system updates that user's last-activity timestamp to the current time

#### Scenario: Timer start from GitHub updates last activity
- **GIVEN** an authenticated workspace member
- **WHEN** the member starts a timer via the GitHub integration path
- **THEN** the system updates that user's last-activity timestamp to the current time

#### Scenario: Timer stop updates last activity
- **GIVEN** an authenticated workspace member with a running timer
- **WHEN** the member stops the timer
- **THEN** the system updates that user's last-activity timestamp to the current time

#### Scenario: Time entry creation updates last activity
- **GIVEN** an authenticated workspace member
- **WHEN** the member creates a manual time entry
- **THEN** the system updates that user's last-activity timestamp to the current time

#### Scenario: Time entry update updates last activity
- **GIVEN** an authenticated workspace member who owns a completed time entry
- **WHEN** the member updates that entry
- **THEN** the system updates that user's last-activity timestamp to the current time

#### Scenario: Time entry deletion updates last activity
- **GIVEN** an authenticated workspace member who owns a completed time entry
- **WHEN** the member deletes that entry
- **THEN** the system updates that user's last-activity timestamp to the current time

### Requirement: Activity Bump Is Non-Blocking
The last-activity timestamp update SHALL NOT block or fail the primary time-tracking operation.

#### Scenario: Activity bump failure does not prevent time entry creation
- **GIVEN** an authenticated workspace member creates a valid time entry
- **WHEN** the last-activity timestamp update encounters an error
- **THEN** the time entry is still created successfully
- **AND** the error is logged for observability

### Requirement: Last Activity Starts Null
The last-activity timestamp SHALL be null for users who have never performed a time-tracking write after this feature is deployed.

#### Scenario: New user has null last activity
- **GIVEN** a workspace member who has never started a timer or created a time entry
- **WHEN** the member list is retrieved
- **THEN** that member's last-activity timestamp is null
