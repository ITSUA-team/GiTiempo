## ADDED Requirements

### Requirement: Shared Task Metadata Contract

The shared task contracts MUST define the request and response shapes for editable task description, priority, status, and assignee metadata.

#### Scenario: Task response contract includes metadata
- **WHEN** frontend or backend code consumes a task response
- **THEN** the shared task response schema includes nullable `description`
- **AND** it includes `priority` with values `low`, `medium`, or `high`
- **AND** it includes `status` with existing task status values
- **AND** it includes `assignees` member summary data containing each assigned user's id and display fields

#### Scenario: Task create contract accepts metadata
- **GIVEN** a client constructs a task create request
- **WHEN** the request payload is validated against the shared create task schema
- **THEN** the payload accepts `description` as an optional nullable string limited to 2000 characters
- **AND** the payload accepts `priority` as an optional value of `low`, `medium`, or `high`
- **AND** the payload accepts `status` as an optional task status value
- **AND** the payload accepts `assigneeIds` as an optional array of unique user ids
- **AND** the payload rejects unknown additional fields

#### Scenario: Task update contract accepts metadata
- **GIVEN** a client constructs a task update request
- **WHEN** the request payload is validated against the shared update task schema
- **THEN** the payload accepts description, priority, status, assigneeIds, title, and isActive as mutable task fields
- **AND** the payload is valid when at least one mutable field is supplied
- **AND** the payload rejects unknown additional fields

#### Scenario: OpenAPI exports task metadata contract
- **WHEN** the OpenAPI contract is exported
- **THEN** task create, update, list, and detail schemas document the new task metadata fields
