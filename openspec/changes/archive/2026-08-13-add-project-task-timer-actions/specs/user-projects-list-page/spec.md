## ADDED Requirements

### Requirement: User Projects Direct Task Timer Actions

The Projects list page SHALL provide a task-specific direct timer action beside each visible task name on desktop rows and mobile cards while preserving the global top-bar timer as the authoritative task-picker and cross-workspace recovery surface.

#### Scenario: Idle task row starts a fresh timer

- **GIVEN** the authenticated member has no running timer
- **AND** a visible active task is rendered on the Projects page
- **WHEN** the member activates that task's direct timer action
- **THEN** the app starts a fresh timer for that task without opening the task-picker dialog
- **AND** the action uses task-specific tooltip and accessible label copy `Start timer for <task title>`
- **AND** the app shows success feedback and refreshes the shared authoritative timer state

#### Scenario: Matching running task row stops the timer

- **GIVEN** the authenticated member's authoritative running timer belongs to a task rendered on the Projects page
- **WHEN** the Projects task section renders
- **THEN** that task's direct action is `Stop timer`
- **AND** the action uses task-specific tooltip and accessible label copy `Stop timer for <task title>`
- **WHEN** the member activates the action
- **THEN** the app verifies that the authoritative timer still belongs to that task
- **AND** conditionally stops that exact authoritative timer without opening the task-picker dialog
- **AND** shows success feedback and refreshes the shared authoritative timer state

#### Scenario: Another task already owns the running timer

- **GIVEN** the authenticated member has a running timer for a different task
- **WHEN** the Projects page renders another task's direct start action
- **THEN** that start action is presented as blocked
- **AND** activating it does not send a start request
- **AND** opens the existing top-bar task-and-timer guidance so the member can stop the current timer first

#### Scenario: Another workspace owns the running timer

- **GIVEN** the authenticated member has a running timer in another workspace
- **WHEN** the member activates a Projects task's blocked direct start action in the active workspace
- **THEN** the app does not send a start request for the Projects task
- **AND** opens the existing cross-workspace stop-first guidance in the top-bar task-and-timer surface
- **AND** preserves the Projects filters and task list state

#### Scenario: Stale start conflict reconciles authoritative state

- **GIVEN** the Projects page believes no timer is running
- **AND** another timer becomes authoritative before a direct start request completes
- **WHEN** the backend rejects the direct start with `409 Conflict`
- **THEN** the app shows the backend failure message
- **AND** refreshes the authoritative current-timer state
- **AND** opens the existing stop-first guidance
- **AND** does not clear Projects filters or task state as if the start had succeeded

#### Scenario: Stale stop action does not stop a changed timer

- **GIVEN** a Projects task is rendered with a `Stop timer` action
- **AND** the authoritative running timer changes before the member activates that action
- **WHEN** the member activates the stale stop action
- **THEN** the app refreshes authoritative timer state
- **AND** does not stop a timer that no longer belongs to the selected task
- **AND** provides retryable feedback that the timer changed

#### Scenario: Closed tasks are not offered a direct timer action

- **GIVEN** a visible Projects task has status `closed`
- **WHEN** the Projects page renders the task row or card
- **THEN** it does not render a direct start or stop timer action

#### Scenario: Direct timer request failure remains retryable

- **WHEN** a Projects direct start or stop request fails
- **THEN** the app shows task-scoped loading only while the request is pending
- **AND** surfaces repository-standard toast feedback for the failure
- **AND** refreshes authoritative timer state
- **AND** leaves the Projects page, filters, and task rows available for retry

#### Scenario: Timer mutation locks all direct actions

- **WHEN** a Projects direct start or stop request, or authoritative timer reconciliation, is pending
- **THEN** every Projects direct timer action is native-disabled
- **AND** only the task that initiated the request displays its loading state

#### Scenario: Desktop task rows render the timer action beside the task name

- **GIVEN** the Projects page renders at or above the mobile breakpoint
- **WHEN** a project task row is visible
- **THEN** the row renders the direct timer action immediately before the task-title group in the task column
- **AND** preserves the task title, optional GitHub issue link, status, and updated metadata

#### Scenario: Mobile task cards preserve timer action parity

- **GIVEN** the Projects page renders below the mobile breakpoint
- **WHEN** a project task card is visible
- **THEN** the card renders the same direct start, stop, blocked, and pending states as the desktop row
- **AND** places the timer action beside the task-title block
- **AND** preserves the task title, optional GitHub issue link, status, and updated metadata
