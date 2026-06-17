## ADDED Requirements

### Requirement: Project Default Billable Controls Future Tasks
The system MUST allow permitted project editors to persist a default billable value that new tasks inherit when no task-level default is explicitly provided.

#### Scenario: Project is created with explicit task billable default
- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project with `defaultBillableForTasks`
- **THEN** the system stores that value on the project
- **AND** subsequent project reads return the stored value

#### Scenario: Project is created without explicit task billable default
- **GIVEN** the requester has permission to create projects
- **WHEN** the requester creates a project without `defaultBillableForTasks`
- **THEN** the system stores `defaultBillableForTasks: true`
- **AND** subsequent project reads return `true`

#### Scenario: Project default update saves future default only
- **GIVEN** the requester has permission to update a project
- **AND** the project has existing tasks or time entries
- **WHEN** the requester updates only `defaultBillableForTasks`
- **THEN** the system stores the new project default
- **AND** subsequent project reads return the new default
- **AND** existing task default billable values remain unchanged until a project backfill is explicitly requested
- **AND** existing time-entry billable values remain unchanged until a project backfill is explicitly requested

### Requirement: Project Billable Default Backfill Updates Selected Existing Records
The system MUST provide an explicit project-level propagation operation that updates selected existing downstream records from the already-saved project default billable value.

#### Scenario: Project backfill updates existing task defaults
- **GIVEN** the requester has permission to update a project
- **AND** the project has existing tasks
- **AND** the project has a saved `defaultBillableForTasks` value
- **WHEN** the requester asks to update existing tasks for that project
- **THEN** the system sets each task's `defaultBillableForTimeEntries` to the project's saved default value
- **AND** the response reports the number of tasks updated

#### Scenario: Project backfill updates existing project time entries
- **GIVEN** the requester has permission to update a project
- **AND** the project has existing time entries
- **AND** the project has a saved `defaultBillableForTasks` value
- **WHEN** the requester asks to update existing time entries for that project
- **THEN** the system sets each linked time entry's `isBillable` value to the project's saved default value
- **AND** the response reports the number of time entries updated

#### Scenario: Project backfill can update tasks and time entries together
- **GIVEN** the requester has permission to update a project
- **AND** the project has existing tasks and time entries
- **WHEN** the requester asks to update both existing tasks and existing time entries
- **THEN** the system updates both selected downstream record types in one request
- **AND** the response reports task and time-entry update counts independently

#### Scenario: Project backfill requires update permission
- **GIVEN** the requester cannot update the project under existing project update policy
- **WHEN** the requester asks to backfill the project's billable default
- **THEN** the system rejects the request without changing tasks or time entries
