## ADDED Requirements

### Requirement: Shared Time Entry Response Contract
The shared contracts SHALL define stable time-entry response shapes for backend responses and frontend consumers.

#### Scenario: Time entry response uses shared schema
- **GIVEN** the backend returns a time entry
- **WHEN** frontend or backend code consumes the response
- **THEN** the payload matches the shared time-entry response contract
- **AND** includes ownership, task, project, timing, duration, billable, source, and timestamp fields

#### Scenario: Current timer response uses shared schema
- **GIVEN** the backend returns current timer state
- **WHEN** frontend or extension code consumes the response
- **THEN** the payload matches a shared current-timer response contract
- **AND** represents either one running entry or no running entry

#### Scenario: Time entry list response uses shared schema
- **GIVEN** the backend returns a list of time entries
- **WHEN** frontend code consumes the response
- **THEN** the payload matches a shared list response contract
- **AND** includes pagination metadata

### Requirement: Shared Time Entry Request Validation
The shared contracts SHALL define validation rules for manual entry creation, entry updates, timer actions, Chrome Extension timer starts, and list filters.

#### Scenario: Manual create request uses shared schema
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier, start time, and end time
- **AND** rejects unknown additional fields

#### Scenario: Time entry update request uses shared schema
- **GIVEN** a client constructs a time-entry update request
- **WHEN** the request payload is validated
- **THEN** the payload requires at least one mutable time-entry field
- **AND** rejects unknown additional fields

#### Scenario: Timer start request uses shared schema
- **GIVEN** a client constructs a timer start request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier
- **AND** rejects unknown additional fields

#### Scenario: Chrome GitHub start request uses shared schema
- **GIVEN** the Chrome Extension constructs a GitHub issue timer request
- **WHEN** the request payload is validated
- **THEN** the payload requires a GitHub repository key, issue number, and issue title
- **AND** rejects unknown additional fields

#### Scenario: Time entry list query uses shared schema
- **GIVEN** a client constructs a time-entry list query
- **WHEN** the query is validated
- **THEN** the query accepts shared pagination fields and time-entry filters
- **AND** rejects invalid filter values

### Requirement: Shared Time Entry Source Contract
The shared contracts SHALL define the supported time-entry source values.

#### Scenario: Source value is validated
- **GIVEN** code validates a time-entry source
- **WHEN** the value is checked against the shared source contract
- **THEN** only `web`, `extension`, and `manual` are valid
