## ADDED Requirements

### Requirement: Current Running Timer Is User-Global Across Workspaces

The backend SHALL expose the authenticated user's single running timer regardless of the active workspace claim, while preserving workspace-scoped authorization for starting timers against tasks.

#### Scenario: Current timer returns running entry from another workspace

- **GIVEN** an authenticated user has a running timer in workspace A
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user requests the current running timer
- **THEN** the backend returns the running time entry from workspace A
- **AND** the response includes enough safe workspace identity or display metadata for the frontend to label workspace A

#### Scenario: Current timer is empty only when user has no running timer

- **GIVEN** an authenticated user has no running timer in any workspace
- **WHEN** the user requests the current running timer from any active workspace session
- **THEN** the backend returns an explicit empty current-timer response

#### Scenario: Stop timer stops running entry from another workspace

- **GIVEN** an authenticated user has a running timer in workspace A
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user stops the current running timer
- **THEN** the backend stops the user's running timer in workspace A
- **AND** the response returns the completed time entry with its original workspace identity

#### Scenario: Start timer remains scoped to active workspace task visibility

- **GIVEN** an authenticated user has no running timer
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user starts a timer for a task visible in workspace B
- **THEN** the backend creates the running time entry in workspace B
- **AND** the backend does not create or move a time entry in any other workspace

#### Scenario: Start timer rejects while another workspace timer is running

- **GIVEN** an authenticated user has a running timer in workspace A
- **AND** the user's active session token is scoped to workspace B
- **WHEN** the user attempts to start a timer for a visible workspace B task
- **THEN** the backend rejects the request with `409 Conflict`
- **AND** the existing workspace A running timer remains running and unchanged

#### Scenario: User cannot stop another user's timer across workspaces

- **GIVEN** another user has a running timer in any workspace
- **WHEN** the authenticated user requests the current running timer or stops the current running timer
- **THEN** the backend does not return or stop the other user's timer
