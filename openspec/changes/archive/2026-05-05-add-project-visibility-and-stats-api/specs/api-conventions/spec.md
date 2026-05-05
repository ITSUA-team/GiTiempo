## ADDED Requirements

### Requirement: Project Summary Windows Are Calendar Based
The API MUST calculate project tracked-hour summary windows from calendar boundaries.

#### Scenario: Weekly tracked-hour summary uses ISO calendar week
- **GIVEN** a client requests a project summary with weekly tracked hours
- **WHEN** the backend calculates the weekly window
- **THEN** the window starts at Monday 00:00:00 UTC of the current ISO week
- **AND** the window ends at the request time or the start of the next ISO week, whichever is earlier

#### Scenario: Monthly tracked-hour summary starts on first day
- **GIVEN** a client requests a project summary with monthly tracked hours
- **WHEN** the backend calculates the monthly window
- **THEN** the window starts at 00:00:00 UTC on the first day of the current calendar month
- **AND** the window ends at the request time or the start of the next calendar month, whichever is earlier

### Requirement: Scoped Project Summary Counts Are Distinct
The API MUST count scoped project summary values distinctly when a project matches more than one visibility path.

#### Scenario: PM summary counts public assigned project once
- **GIVEN** a `pm` is assigned to an active public project
- **WHEN** the backend calculates management project summary counts for that PM
- **THEN** the project contributes once to `activeProjects`
- **AND** the project contributes once to `publicProjects`

#### Scenario: Management visibility counts exclude inactive projects
- **GIVEN** a project is inactive
- **WHEN** the backend calculates management project summary counts
- **THEN** the project does not contribute to `activeProjects`, `privateProjects`, or `publicProjects`
