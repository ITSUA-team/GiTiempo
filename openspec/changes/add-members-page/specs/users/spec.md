## ADDED Requirements

### Requirement: Last Activity Tracking

The system MUST track a per-user last-activity timestamp and update it whenever the user performs a time-tracking write operation.

#### Scenario: Time-tracking write updates last activity

- **GIVEN** an authenticated user with an active workspace membership
- **WHEN** that user successfully starts or stops a timer, or creates, updates, or deletes a time entry
- **THEN** the system updates the last-activity timestamp for that user to the current time

#### Scenario: Read-only requests do not update last activity

- **GIVEN** an authenticated user
- **WHEN** that user issues a read-only request such as listing time entries or viewing a project
- **THEN** the system does not update the last-activity timestamp for that user

#### Scenario: New user has no last activity until first write

- **GIVEN** a newly-created user with no time-tracking writes
- **WHEN** the system reports that user's last-activity timestamp
- **THEN** the system reports the value as null
