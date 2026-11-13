# Spec Delta

## MODIFIED Requirements

### Requirement: User Dashboard Overview

The user dashboard SHALL provide an authenticated overview page focused on weekly insight, recent entries, optional summary stats, and direct timer actions scoped only to recent time-entry rows/cards, while relying on the global top-bar timer for the standalone timer surface and task-picker flow. Dashboard Recent Time Entries SHALL use Time Entries as the reference presentation: no column-heading strip, matching desktop row height, column widths, rounding, spacing, typography, task/description composition, and active-entry treatment, and matching mobile card layout.

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
- AND the skeleton matches the headerless Recent Time Entries layout and final row dimensions

#### Scenario: Dashboard with no recent data

- GIVEN the user has no recent time entries or active timer
- WHEN the dashboard loads
- THEN the dashboard uses the shared empty-state pattern for the missing sections

#### Scenario: Dashboard request failure stays distinct

- WHEN the dashboard data request fails
- THEN the page renders the approved request-failure state for the overview surface
- AND the failure is surfaced without turning the page into a standalone timer-control surface

#### Scenario: Dashboard recent entries hide column headings

- GIVEN the Dashboard recent time entries section renders
- WHEN the section is visible on any viewport
- THEN the section does not render a column-heading strip
- AND the Recent Time Entries section heading and `View all` action remain visible

#### Scenario: Dashboard recent entries match Time Entries desktop presentation

- GIVEN the Dashboard recent time entries section renders at or above the mobile breakpoint
- WHEN a recent entry row is visible
- THEN the row uses the same row height, column widths, rounding, spacing, and typography as Time Entries desktop rows
- AND the row composes the task title and optional description the same way as Time Entries
- AND the active running entry receives the same active-entry treatment as Time Entries

#### Scenario: Dashboard recent entries retain description and interaction data

- GIVEN the Dashboard recent time entries section renders entries with descriptions
- WHEN the section renders
- THEN each entry's description is displayed when present, matching Time Entries composition
- AND the entry data needed by interactions is available from already-fetched Dashboard data
- AND no per-row request or duplicate list fetch is issued for presentation

### Requirement: User Record Lists Adapt To Mobile Cards

User-web record-list surfaces SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked record cards below the documented mobile breakpoint. Dashboard recent-entry mobile cards SHALL match the Time Entries mobile card layout: timer action before title, optional description under title, Project and Duration together, and Range below.

#### Scenario: Dashboard recent entries render mobile cards

- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders below the mobile breakpoint
- **THEN** the recent entries section renders one stacked card per recent entry instead of the fixed-width desktop table
- **AND** each card places the timer action before the task title, matching Time Entries mobile cards
- **AND** each card shows the optional description under the title when present, matching Time Entries
- **AND** each card shows Project and Duration together and the time Range below, matching Time Entries
- **AND** each card preserves readable truncation for long names and descriptions
- **AND** GitHub issue links are rendered separately from the task title
- **AND** the active running entry card is highlighted and exposes an icon-only `Stop timer` action
- **AND** completed recent-entry cards expose an icon-only `Start timer` action for the entry's task
- **AND** the `View all` action remains available from the recent entries section

#### Scenario: Dashboard recent entries preserve desktop table

- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop table with task, project, range, and duration columns
- **AND** the table does not render a column-heading strip
- **AND** completed recent-entry rows expose an icon-only `Start timer` action for the entry's task before the task label
- **AND** the active running recent-entry row is highlighted and exposes an icon-only `Stop timer` action before the task label

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
- **THEN** the section continues to render the existing desktop entry table with task, project, time, duration, and actions columns
- **AND** completed entries expose an icon-only `Start timer` action for the entry's task before the task label
- **AND** active running entries expose an icon-only `Stop timer` action before the task label and do not expose edit or delete actions

### Requirement: Dashboard Recent Entry Direct Timer Controls

Dashboard Recent Time Entries SHALL provide direct timer actions only for listed recent entries, using the same task-targeted timer semantics as Time Entries row/card controls. Dashboard task-title interactions SHALL match Time Entries: completed entries open the existing entry-edit flow, and the authoritative running entry opens the existing global timer picker. Dashboard stop-first guidance SHALL match Time Entries when another task or workspace owns the timer.

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

#### Scenario: Dashboard completed entry task title opens entry editor

- **GIVEN** the Dashboard Recent Time Entries section shows a completed entry
- **WHEN** the user activates the entry's task title
- **THEN** the app opens the existing entry-edit flow used by Time Entries
- **AND** the edit dialog reuses the same validation, permissions, save/delete behavior, and post-mutation reconciliation
- **AND** Dashboard recent entries, running state, and affected summaries update after the mutation without a full-page reload

#### Scenario: Dashboard running entry task title opens global timer picker

- **GIVEN** the Dashboard Recent Time Entries section shows the authoritative running entry
- **WHEN** the user activates that entry's task title
- **THEN** the app verifies via the emitted entry ID that the clicked entry is still the authoritative current timer
- **AND** if the timer changed, the app refreshes timer and entry state, shows an info toast, and does not open the picker
- **AND** when the clicked entry is confirmed as the running timer, the app opens the existing global top-bar timer picker
- **AND** the picker allows reassigning the running timer's task or description as in Time Entries

#### Scenario: Dashboard running entry stale check before opening picker

- **GIVEN** the Dashboard Recent Time Entries section shows a running entry
- **AND** the running timer changed in another session or tab
- **WHEN** the user activates that entry's task title
- **THEN** the app refreshes timer and entry state and does not open the global timer picker
- **AND** the app shows an info toast that the timer status was refreshed

#### Scenario: Dashboard stop-first guidance matches Time Entries

- **GIVEN** the Dashboard Recent Time Entries section shows a completed entry
- **AND** another task or workspace owns the running timer
- **WHEN** the user attempts to start a timer from that entry
- **THEN** the app provides the same stop-first guidance as Time Entries
- **AND** the guidance allows stopping the current timer before starting the selected task
- **AND** the disabled pending and loading states, authoritative current-state and access checks, conflict handling, and duplicate-start/stop protection remain in force

#### Scenario: Dashboard direct timer mutations provide visible feedback

- **WHEN** a Dashboard recent-entry direct start or stop succeeds
- **THEN** the app reconciles visible Dashboard timer state and affected summaries
- **AND** failed direct starts or stops show an error toast using the backend or client error message

## ADDED Requirements

### Requirement: Dashboard Recent Entries Reuse Time Entries Presentation Components

Dashboard Recent Time Entries SHALL reuse small app-local row, card, and content components or existing utilities from Time Entries when presentation and actions match, without duplicating per-surface markup or forcing Projects tasks into a time-entry model.

#### Scenario: Dashboard reuses shared row or card presentation

- **GIVEN** the Dashboard and Time Entries render equivalent recent entries
- **WHEN** either surface renders a row or card
- **THEN** both surfaces use the same app-local row, card, or content component for matching presentation and actions
- **AND** Dashboard-specific orchestration such as weekly insight, summary stats, and the `View all` action remains in the Dashboard view
- **AND** Time Entries day grouping, totals, and create controls remain in the Time Entries view
