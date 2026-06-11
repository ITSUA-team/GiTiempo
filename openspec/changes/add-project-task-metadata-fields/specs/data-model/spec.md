## ADDED Requirements

### Requirement: Task Metadata Is Stored On Core Task Records

The backend data model MUST store task description, priority, and assignee as provider-neutral task metadata while keeping provider-specific identifiers in external reference records.

#### Scenario: Task row stores editable metadata
- **WHEN** a task row is stored
- **THEN** the row can represent a nullable description
- **AND** the row stores a priority value of `low`, `medium`, or `high`
- **AND** the row can represent a nullable assignee reference
- **AND** provider-specific identifiers are not stored as task columns

#### Scenario: Existing tasks receive default metadata values
- **WHEN** the metadata migration is applied to existing task rows
- **THEN** tasks without an explicit description have `null` description
- **AND** tasks without an explicit priority have `medium` priority
- **AND** tasks without an explicit assignee have `null` assignee

#### Scenario: Task assignee remains workspace-scoped
- **GIVEN** a task belongs to a workspace project
- **WHEN** the backend stores an assignee for that task
- **THEN** the assignee references an active user in the same workspace
- **AND** the assignee must be assigned to the task's project

#### Scenario: Task assignee can be unset
- **GIVEN** a task has an assignee
- **WHEN** the backend clears that assignment
- **THEN** the task remains stored with no assignee reference
