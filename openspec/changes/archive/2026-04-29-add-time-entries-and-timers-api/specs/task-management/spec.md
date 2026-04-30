## ADDED Requirements

### Requirement: Visible Active Tasks Can Receive Time Tracking
The system MUST allow time tracking only against tasks that the requester can see and that remain active under an active project.

#### Scenario: Visible active task accepts time tracking
- **GIVEN** the requester has visibility to an active task in an active project
- **WHEN** the requester creates a manual entry or starts a timer for that task
- **THEN** the system accepts the task as a valid tracking target

#### Scenario: Invisible task cannot receive time tracking
- **GIVEN** the requester lacks visibility to a task's project
- **WHEN** the requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 404 Not Found

#### Scenario: Inactive task cannot receive time tracking
- **GIVEN** a task is inactive
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity

#### Scenario: Task in inactive project cannot receive time tracking
- **GIVEN** a task belongs to an inactive project
- **WHEN** a requester creates a manual entry or starts a timer for that task
- **THEN** the system responds with 422 Unprocessable Entity
