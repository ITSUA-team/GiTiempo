## ADDED Requirements

### Requirement: New Time Entries Inherit Task Billable Default
The backend MUST initialize new time-entry billable state from the selected task's default billable value unless the create flow explicitly supplies an entry-level override.

#### Scenario: Manual entry inherits task default when omitted
- **GIVEN** an authenticated workspace member has visibility to an active open task in an active project
- **AND** the task has `defaultBillableForTimeEntries: false`
- **WHEN** the member creates a manual entry for that task without `isBillable`
- **THEN** the backend stores the new completed time entry with `isBillable: false`

#### Scenario: Manual entry can override task default
- **GIVEN** an authenticated workspace member has visibility to an active open task in an active project
- **AND** the task has `defaultBillableForTimeEntries: false`
- **WHEN** the member creates a manual entry for that task with `isBillable: true`
- **THEN** the backend stores the new completed time entry with `isBillable: true`

#### Scenario: Timer start inherits task default
- **GIVEN** an authenticated user has no running timer
- **AND** the user has visibility to an active open task with `defaultBillableForTimeEntries: false`
- **WHEN** the user starts a timer for that task
- **THEN** the backend creates a running time entry with `isBillable: false`

#### Scenario: Chrome extension timer start inherits task default
- **GIVEN** an authenticated user has no running timer
- **AND** the Chrome extension starts a timer for a GitHub issue mapped to a task with `defaultBillableForTimeEntries: false`
- **WHEN** the backend creates the running time entry
- **THEN** the entry has `isBillable: false`

#### Scenario: Lazily created extension task inherits project default
- **GIVEN** an authenticated user has no running timer
- **AND** the Chrome extension starts a timer for a GitHub issue that has no local task mapping
- **WHEN** the backend lazily creates the task under a project with `defaultBillableForTasks: false`
- **THEN** the created task has `defaultBillableForTimeEntries: false`
- **AND** the created running time entry has `isBillable: false`
