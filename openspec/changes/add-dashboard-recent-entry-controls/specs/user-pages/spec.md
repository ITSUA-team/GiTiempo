## MODIFIED Requirements

### Requirement: User Dashboard Overview

The user dashboard SHALL provide an authenticated overview page focused on weekly insight, recent entries, optional summary stats, and direct timer actions scoped only to recent time-entry rows/cards, while relying on the global top-bar timer for the standalone timer surface and task-picker flow.

#### Scenario: Dashboard renders approved overview content

- WHEN the dashboard loads
- THEN the page shows weekly insight content and recent time-entry activity
- AND the page may include optional stats cards or panels when data is available
- AND the page does not render a standalone page-content timer widget or timer panel
- AND Dashboard timer controls, when present, are limited to direct actions on Recent Time Entries rows or cards

#### Scenario: Running timer ownership stays in global top bar

- GIVEN the authenticated user has a running timer
- WHEN the dashboard loads
- THEN the global top-bar timer remains the primary running timer surface
- AND the dashboard may provide a direct `Stop timer` action only on the Recent Time Entries row or card that represents the authoritative running entry
- AND the dashboard does not provide a separate timer widget, task-picker, pause/resume action, or standalone stop panel in page content

#### Scenario: Dashboard shows initial skeleton loading

- WHEN the dashboard data request is pending
- THEN the page renders the approved skeleton loading state for the overview surface

#### Scenario: Dashboard with no recent data

- GIVEN the user has no recent time entries or active timer
- WHEN the dashboard loads
- THEN the dashboard uses the shared empty-state pattern for the missing sections

#### Scenario: Dashboard request failure stays distinct

- WHEN the dashboard data request fails
- THEN the page renders the approved request-failure state for the overview surface
- AND the failure is surfaced without turning the page into a standalone timer-control surface

### Requirement: User Record Lists Adapt To Mobile Cards
User-web record-list surfaces SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked record cards below the documented mobile breakpoint.

#### Scenario: Dashboard recent entries render mobile cards
- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders below the mobile breakpoint
- **THEN** the recent entries section renders one stacked card per recent entry instead of the fixed-width desktop table
- **AND** each card shows the entry task title, project name, time range, duration, and highlighted running/current-entry state when applicable
- **AND** completed recent-entry cards expose an icon-only `Start timer` action for the entry's task
- **AND** the active running recent-entry card exposes an icon-only `Stop timer` action
- **AND** the `View all` action remains available from the recent entries section

#### Scenario: Dashboard recent entries preserve desktop table
- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop table with task, project, range, and duration columns
- **AND** completed recent-entry rows expose an icon-only `Start timer` action for the entry's task before the task label
- **AND** the active running recent-entry row exposes an icon-only `Stop timer` action before the task label

#### Scenario: Time entry day sections render mobile cards
- **GIVEN** the Time Entries page has a day group with own time entries
- **WHEN** the day section renders below the mobile breakpoint
- **THEN** the section renders one stacked card per time entry instead of the fixed-width desktop entry table
- **AND** each card shows the task title, optional description, project name, time range, duration, and running-entry highlight when applicable
- **AND** completed entry cards expose an icon-only `Start timer` action for the entry's task and keep the task title as the edit-entry affordance
- **AND** active running entry cards expose an icon-only `Stop timer` action and do not expose edit or delete actions

#### Scenario: Time entry day sections preserve desktop table
- **GIVEN** the Time Entries page has a day group with own time entries
- **WHEN** the day section renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop entry table with task, project, time range, and duration columns
- **AND** completed entries expose an icon-only `Start timer` action for the entry's task before the task label
- **AND** active running entries expose an icon-only `Stop timer` action before the task label and do not expose edit or delete actions

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
- **AND** it SHALL use the running-entry range, live duration, highlighted running/current visual state, and direct `Stop timer` action defined for Dashboard recent entries

#### Scenario: Dashboard recent entries update after top-bar timer stop

- **GIVEN** an authenticated user is viewing the Dashboard
- **AND** the Recent Time Entries section includes the running entry controlled by the top-bar timer
- **WHEN** the top-bar timer stop action succeeds and returns the completed time entry
- **THEN** the matching Dashboard row or card SHALL update without a page refresh
- **AND** it SHALL render the completed range and duration from the returned entry
- **AND** it SHALL no longer render running/current highlighting or live duration growth for that entry
- **AND** it SHALL render the completed-entry direct `Start timer` action for that entry's task when direct starts are otherwise available
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

## ADDED Requirements

### Requirement: Dashboard Recent Entry Direct Timer Controls
Dashboard Recent Time Entries SHALL provide direct timer actions only for listed recent entries, using the same task-targeted timer semantics as Time Entries row/card controls.

#### Scenario: Completed dashboard recent entry starts a fresh timer
- **GIVEN** the Dashboard Recent Time Entries section shows a completed entry
- **AND** no current timer blocks direct starts
- **WHEN** the user activates that entry's `Start timer` action
- **THEN** the app starts a fresh running time entry for the same task
- **AND** it does not open the global top-bar task-picker popup
- **AND** the action uses task-specific accessible copy such as `Start timer for Improve reports filters`

#### Scenario: Running dashboard recent entry stops only when authoritative
- **GIVEN** the Dashboard Recent Time Entries section shows a running entry
- **WHEN** the user activates that entry's `Stop timer` action
- **THEN** the app verifies that the clicked entry is still the authoritative current timer before calling stop
- **AND** if the current timer changed, the app refreshes timer and entry state and does not stop a different timer
- **AND** the action uses task-specific accessible copy such as `Stop timer for Improve reports filters`

#### Scenario: Dashboard recent entry direct starts are blocked by an active timer
- **GIVEN** the Dashboard Recent Time Entries section shows a completed entry
- **AND** the current timer guard reports an active running timer or is still fetching authoritative state
- **WHEN** the entry renders
- **THEN** the `Start timer` action is disabled
- **AND** activating it does not start a timer or show a mutation failure toast

#### Scenario: Dashboard direct timer mutations provide visible feedback
- **WHEN** a Dashboard recent-entry direct start or stop succeeds
- **THEN** the app shows success feedback and reconciles visible Dashboard timer state
- **AND** failed direct starts or stops show an error toast using the backend or client error message
