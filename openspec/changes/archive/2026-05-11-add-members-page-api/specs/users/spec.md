## ADDED Requirements

### Requirement: Users Table Stores Last Activity Timestamp
The users data model SHALL include a nullable last-activity timestamp column that records when the user last performed a tracked write operation.

#### Scenario: Column exists with null default
- **GIVEN** the users table schema
- **WHEN** a new user record is created
- **THEN** the last-activity timestamp is null by default

#### Scenario: Column accepts timestamp updates
- **GIVEN** an existing user record
- **WHEN** the system updates the user's last-activity timestamp
- **THEN** the new timestamp value is persisted
