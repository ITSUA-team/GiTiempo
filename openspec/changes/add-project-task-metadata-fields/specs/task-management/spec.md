## ADDED Requirements

### Requirement: Task Metadata Can Be Created And Updated

The system MUST support editable provider-neutral task metadata for description, priority, status, and assignee while preserving existing task visibility and project access rules.

#### Scenario: Visible member creates task with metadata
- **GIVEN** the requester has visibility to an active project
- **WHEN** the requester creates a task with title, description, priority, status, and assignee
- **THEN** the system creates the task in the requester's workspace and target project
- **AND** the task stores the supplied description, priority, status, and assignee metadata

#### Scenario: Task creation applies metadata defaults
- **GIVEN** the requester has visibility to an active project
- **WHEN** the requester creates a task without optional metadata values
- **THEN** the system creates the task with a `null` description
- **AND** the task priority defaults to `medium`
- **AND** the task status defaults to `open`
- **AND** the task assignee is `null`

#### Scenario: Visible member updates task metadata
- **GIVEN** the requester has visibility to a task's active project
- **WHEN** the requester updates the task description, priority, status, or assignee
- **THEN** the system applies the supplied metadata changes
- **AND** omitted mutable fields remain unchanged

#### Scenario: Task assignee must belong to the task project
- **GIVEN** the requester has visibility to a task's active project
- **WHEN** the requester creates or updates the task with an assignee who is not an active member assigned to that project
- **THEN** the system rejects the request without changing the task

#### Scenario: Task metadata can be cleared
- **GIVEN** the requester has visibility to a task's active project
- **WHEN** the requester updates the task description or assignee to `null`
- **THEN** the system clears that metadata field
- **AND** the task remains otherwise unchanged

### Requirement: Task Responses Expose Metadata Needed By Projects Modals

The system MUST include task metadata needed by Projects task create and edit modals in task list and detail responses.

#### Scenario: Task list response includes metadata
- **WHEN** a requester lists visible tasks for a project
- **THEN** each task response includes description, priority, status, and assignee metadata

#### Scenario: Task detail response includes metadata
- **WHEN** a requester reads a visible task by id
- **THEN** the task response includes description, priority, status, and assignee metadata
