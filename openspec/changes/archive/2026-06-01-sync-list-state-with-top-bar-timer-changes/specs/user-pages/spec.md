## ADDED Requirements

### Requirement: Top-Bar Timer Changes Synchronize User Time Entry Lists

The user app SHALL synchronize visible Dashboard weekly aggregate state, Dashboard recent-entry state, and Time Entries list state with successful global top-bar timer lifecycle changes without requiring a page refresh.

#### Scenario: Dashboard weekly aggregates update after top-bar timer start

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Dashboard weekly focus or stats depend on the current-week entry set
- **WHEN** the top-bar timer start action succeeds and returns a running time entry that belongs in the current-week dashboard query scope
- **THEN** the Dashboard weekly focus and stats SHALL update without a page refresh
- **AND** the updated values SHALL continue to derive from the same current-week entry set semantics used by the Dashboard overview

#### Scenario: Dashboard weekly aggregates update after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Dashboard weekly focus or stats currently include the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the Dashboard weekly focus and stats SHALL update without a page refresh
- **AND** the updated values SHALL reflect the completed duration from the returned entry
- **AND** the Dashboard SHALL NOT require a full page reload to clear stale running-entry contribution from weekly aggregates

#### Scenario: Dashboard recent entries update after top-bar timer start

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the top-bar timer start action succeeds and returns a running time entry
- **WHEN** the returned entry belongs in the Dashboard recent-entry scope
- **THEN** the Recent Time Entries row or card for that entry SHALL appear or update without a page refresh
- **AND** it SHALL use the running-entry range, live duration, and highlighted running/current visual state defined for Dashboard recent entries
- **AND** the Dashboard SHALL NOT expose page-local timer stop controls.

#### Scenario: Dashboard recent entries update after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Recent Time Entries section includes the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the matching Dashboard row or card SHALL update without a page refresh
- **AND** it SHALL render the completed range and duration from the returned entry
- **AND** it SHALL no longer render running/current highlighting or live duration growth for that entry
- **AND** the recent-entry ordering SHALL continue to follow the backend list ordering semantics.

#### Scenario: Time Entries list updates after top-bar timer start

- **GIVEN** an authenticated user is viewing the Time Entries page
- **AND** the top-bar timer start action succeeds and returns a running time entry
- **WHEN** the returned entry belongs in the current Time Entries visible list scope
- **THEN** the grouped entry list SHALL appear or update without a page refresh
- **AND** any currently visible row or card with the same `id` SHALL be replaced by the returned entry
- **AND** a new row or card SHALL be inserted only when the returned entry matches the active filters and the current list scope is unpaged or on page 1
- **AND** later paginated pages SHALL NOT inject a new row or card for that started entry
- **AND** paginated visible scopes that gain the new entry locally SHALL update `total` and `totalPages` consistently with the visible list state
- **AND** the running entry row or card SHALL use the running-entry visual treatment
- **AND** edit and delete actions SHALL remain unavailable for that running entry.

#### Scenario: Time Entries list updates after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Time Entries page
- **AND** the visible list includes the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the matching grouped row or card SHALL update without a page refresh
- **AND** if the completed entry no longer matches the active filters, that visible row or card SHALL be removed from the current list scope
- **AND** paginated visible scopes that lose the entry locally SHALL update `total` and `totalPages` consistently with the visible list state
- **AND** filtered or paginated scopes that cannot be preserved safely through local reconciliation SHALL remain unchanged until the existing list reload path runs
- **AND** it SHALL render the completed range and duration from the returned entry
- **AND** running-entry highlighting and live duration growth SHALL stop for that entry
- **AND** edit and delete actions SHALL follow the existing completed-entry rules.

#### Scenario: Idle top-bar task selection does not create list state

- **GIVEN** no timer is running
- **WHEN** the user changes the selected task in the global top-bar timer
- **THEN** Dashboard recent entries and Time Entries SHALL NOT insert a synthetic row or card
- **AND** they SHALL NOT mark an entry as running/current solely because of idle task selection.

#### Scenario: Failed top-bar timer mutation leaves lists unchanged

- **GIVEN** the Dashboard or Time Entries page has visible time-entry list state
- **WHEN** a top-bar timer start or stop action fails
- **THEN** visible list state SHALL remain based on the previously loaded or reconciled entries.
