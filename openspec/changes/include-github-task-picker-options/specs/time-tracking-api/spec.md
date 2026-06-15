## ADDED Requirements

### Requirement: GitHub Issue Selection Can Be Materialized For Timer Target

The backend MUST allow an authenticated active workspace member with a usable connected GitHub account to resolve a visible GitHub issue selection into a local active open task target without starting, stopping, or updating a timer.

#### Scenario: Connected user materializes new GitHub issue selection

- **GIVEN** an authenticated active workspace member has a connected GitHub account
- **AND** no local project/task mapping exists for a GitHub issue visible through that connection
- **WHEN** the user resolves that GitHub issue as a timer target
- **THEN** the backend creates provider-neutral local project and task records as needed
- **AND** stores GitHub provider references outside the core project and task rows
- **AND** returns the local project and task context
- **AND** does not create, stop, or update a time entry

#### Scenario: Existing GitHub issue mapping is reused

- **GIVEN** local provider references already map the selected GitHub issue to an active open task
- **AND** the authenticated user can see that mapped task's project
- **WHEN** the user resolves that GitHub issue as a timer target
- **THEN** the backend returns the existing local project and task context
- **AND** does not create duplicate local task records for the same GitHub issue external key

#### Scenario: Materialization preserves non-admin visibility for new local project

- **GIVEN** an authenticated non-admin user resolves a visible GitHub issue that requires a new local project
- **WHEN** the backend creates the local project
- **THEN** the backend ensures the acting user has visibility to that project

#### Scenario: Disconnected user cannot materialize GitHub issue selection

- **GIVEN** an authenticated active workspace member has no usable connected GitHub account
- **WHEN** the user attempts to resolve a GitHub issue as a timer target
- **THEN** the backend rejects the request without creating local project or task records
- **AND** the backend does not call GitHub provider APIs

#### Scenario: Invisible GitHub issue cannot be materialized

- **GIVEN** an authenticated active workspace member has a connected GitHub account
- **AND** the submitted GitHub issue is not visible through that connection
- **WHEN** the user attempts to resolve that GitHub issue as a timer target
- **THEN** the backend rejects the request
- **AND** no local project, task, provider reference, or time entry is created

#### Scenario: Closed mapped task cannot be materialized as timer target

- **GIVEN** local provider references already map the selected GitHub issue to a closed task
- **WHEN** the user attempts to resolve that GitHub issue as a timer target
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the backend does not create, stop, or update a time entry

#### Scenario: Inactive mapped work cannot be materialized as timer target

- **GIVEN** local provider references already map the selected GitHub issue to an inactive task or inactive project
- **WHEN** the user attempts to resolve that GitHub issue as a timer target
- **THEN** the backend rejects the request with 422 Unprocessable Entity
- **AND** the backend does not create, stop, or update a time entry
