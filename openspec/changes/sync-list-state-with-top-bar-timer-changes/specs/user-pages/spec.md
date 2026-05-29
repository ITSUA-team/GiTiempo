## ADDED Requirements

### Requirement: Top-Bar Timer Changes Synchronize User Time Entry Lists

The user app SHALL synchronize visible Dashboard recent-entry and Time Entries list state with successful global top-bar timer lifecycle changes without requiring a page refresh.

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
- **AND** the running entry row or card SHALL use the running-entry visual treatment
- **AND** edit and delete actions SHALL remain unavailable for that running entry.

#### Scenario: Time Entries list updates after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Time Entries page
- **AND** the visible list includes the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the matching grouped row or card SHALL update without a page refresh
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
