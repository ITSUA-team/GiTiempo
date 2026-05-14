## MODIFIED Requirements

### Requirement: Shared Time Entry Request Validation

The shared contracts SHALL define validation rules for manual entry creation, entry updates including optional task reassignment, timer actions, Chrome Extension timer starts, and list filters including task-title search.

#### Scenario: Manual create request uses shared schema
- **GIVEN** a client constructs a manual time-entry create request
- **WHEN** the request payload is validated
- **THEN** the payload requires a task identifier, start time, and end time
- **AND** rejects unknown additional fields

#### Scenario: Time entry update request uses shared schema
- **GIVEN** a client constructs a time-entry update request
- **WHEN** the request payload is validated
- **THEN** the payload accepts optional task identifier, start time, end time, description, and billable fields
- **AND** requires at least one mutable time-entry field
- **AND** rejects unknown additional fields

#### Scenario: Time entry update can change task only by identifier
- **GIVEN** a client constructs a time-entry update request that moves an entry to another task
- **WHEN** the request payload is validated
- **THEN** the payload accepts a valid `taskId`
- **AND** does not accept embedded task or project objects

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
- **AND** accepts an optional task-title `search` filter
- **AND** rejects invalid filter values
