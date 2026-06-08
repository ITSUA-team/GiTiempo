## MODIFIED Requirements

### Requirement: Project Hour Totals Use Completed Time Entries

The backend MUST derive project response time totals from completed time entries linked through project tasks and expose those totals in seconds.

#### Scenario: Project total includes completed entries

- **GIVEN** a project has tasks with completed time entries
- **WHEN** the backend derives the project total seconds
- **THEN** the total equals the sum of completed entry durations for those tasks expressed in seconds

#### Scenario: Project total excludes running entries

- **GIVEN** a project has a running time entry without a duration
- **WHEN** the backend derives the project total seconds
- **THEN** that running entry does not increase the total

#### Scenario: Project with no completed entries has zero seconds

- **GIVEN** a project has no completed time entries
- **WHEN** the backend derives the project total seconds
- **THEN** the total is zero
