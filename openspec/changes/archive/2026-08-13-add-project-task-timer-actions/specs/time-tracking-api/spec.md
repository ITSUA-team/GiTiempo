## MODIFIED Requirements

### Requirement: Running Timer Can Be Stopped
The backend MUST allow an authenticated user to stop their current running timer and convert it into a completed time entry. Clients MAY provide the authoritative running entry identifier to conditionally stop that exact timer; a supplied identifier that no longer identifies the caller's running timer MUST be rejected with `409 Conflict` and MUST NOT stop a replacement timer. Bodyless legacy requests remain supported and retain the no-running-timer `404 Not Found` response.

#### Scenario: User stops running timer
- **GIVEN** an authenticated user has a running timer
- **WHEN** the user stops the timer
- **THEN** the backend sets the entry end time
- **AND** computes the stored duration
- **AND** returns the completed entry

#### Scenario: User conditionally stops the authoritative running timer
- **GIVEN** an authenticated user has a running timer
- **AND** the user provides that running entry's identifier as `expectedTimerId`
- **WHEN** the user stops the timer
- **THEN** the backend stops that exact running entry
- **AND** returns the completed entry

#### Scenario: User conditionally stops a changed timer
- **GIVEN** an authenticated user provides an `expectedTimerId`
- **AND** that identifier does not identify the user's current running timer because it is completed, absent, belongs to another user, or was replaced
- **WHEN** the user attempts to stop a timer
- **THEN** the backend responds with `409 Conflict`
- **AND** the backend does not stop any different running timer

#### Scenario: User stops with no running timer
- **GIVEN** an authenticated user has no running timer
- **AND** the user makes a bodyless legacy stop request
- **WHEN** the user attempts to stop a timer
- **THEN** the backend responds with 404 Not Found
