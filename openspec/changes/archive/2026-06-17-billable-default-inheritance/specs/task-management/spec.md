## ADDED Requirements

### Requirement: Task Default Billable Inherits From Project
The system MUST assign each new task a default billable value for future time entries, using the parent project's default when the create request does not explicitly choose a task default.

#### Scenario: Task inherits project default when omitted
- **GIVEN** the requester can create tasks in a project
- **AND** the project has `defaultBillableForTasks: false`
- **WHEN** the requester creates a task without `defaultBillableForTimeEntries`
- **THEN** the system creates the task with `defaultBillableForTimeEntries: false`
- **AND** subsequent task reads return `false`

#### Scenario: Task create can override inherited default
- **GIVEN** the requester can create tasks in a project
- **AND** the project has `defaultBillableForTasks: false`
- **WHEN** the requester creates a task with `defaultBillableForTimeEntries: true`
- **THEN** the system creates the task with `defaultBillableForTimeEntries: true`
- **AND** subsequent task reads return `true`

#### Scenario: Task response includes default billable for time entries
- **GIVEN** a requester can read a task
- **WHEN** the requester reads the task through list or detail APIs
- **THEN** the response includes the task's `defaultBillableForTimeEntries` value

### Requirement: Task Default Billable Controls Future Time Entries
The system MUST allow permitted task editors to persist a default billable value that new time entries inherit when no entry-level billable value is explicitly provided.

#### Scenario: Task default update saves future default only
- **GIVEN** the requester has permission to update a task
- **AND** the task has existing time entries
- **WHEN** the requester updates only `defaultBillableForTimeEntries`
- **THEN** the system stores the new task default
- **AND** subsequent task reads return the new default
- **AND** existing time-entry billable values remain unchanged until a task backfill is explicitly requested

#### Scenario: Task backfill updates existing time entries
- **GIVEN** the requester has permission to update a task
- **AND** the task has existing time entries
- **AND** the task has a saved `defaultBillableForTimeEntries` value
- **WHEN** the requester asks to update existing time entries for that task
- **THEN** the system sets each linked time entry's `isBillable` value to the task's saved default value
- **AND** the response reports the number of time entries updated

#### Scenario: Task backfill requires update permission
- **GIVEN** the requester cannot update the task under existing task update policy
- **WHEN** the requester asks to backfill the task's billable default
- **THEN** the system rejects the request without changing time entries
