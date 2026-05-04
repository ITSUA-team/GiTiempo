## MODIFIED Requirements

### Requirement: Timer Workflow Page

The timer page MUST allow authenticated users to track time against visible workspace tasks by selecting a project and task, controlling the running timer, and logging manual intervals.

#### Scenario: Timer page loads visible project choices

- **GIVEN** an authenticated user opens the timer page
- **WHEN** the page loads
- **THEN** the page shows the approved timer layout inside the authenticated shell
- **AND** the project selector lists the current user's visible workspace projects
- **AND** the task selector is disabled until a project is selected

#### Scenario: Task choices load after project selection

- **GIVEN** the timer page has loaded visible projects
- **WHEN** the user selects a project
- **THEN** the task selector loads tasks for that selected project
- **AND** the task selector lists only tasks from that project that the user can see

#### Scenario: Task loading failure does not render as empty data

- **GIVEN** the user has selected a project
- **WHEN** the task request fails
- **THEN** the page renders an explicit error state for that failed request
- **AND** the page does not replace that failure with a "no tasks available" empty-state message

#### Scenario: Timer started from selected task

- **GIVEN** the user has no running timer
- **AND** the user has selected a project and task
- **WHEN** the user activates the `Start` CTA
- **THEN** the page starts timing against the selected task
- **AND** the page shows the running timer state with elapsed duration in `HH:MM:SS` format
- **AND** the running timer summary shows the project and task names

#### Scenario: Running timer can be stopped

- **GIVEN** the user has a running timer
- **WHEN** the user activates the `Stop` CTA
- **THEN** the page stops the current timer
- **AND** the page refreshes the current timer state to show that no timer is running

#### Scenario: Running timer locks project and task selection

- **GIVEN** the user has a running timer
- **WHEN** the running timer state is rendered
- **THEN** the project selector is disabled
- **AND** the task selector is disabled
- **AND** the project selector value reflects the running timer's current project
- **AND** the task selector value reflects the running timer's current task
- **AND** the page does not allow project or task selection state to change until the running timer has been stopped

#### Scenario: Timer CTA label follows running state

- **GIVEN** the timer page renders
- **WHEN** no timer is running
- **THEN** the singular timer CTA is labeled `Start`
- **AND** when a timer is running, the singular timer CTA is labeled `Stop`

#### Scenario: Running timer display continues to advance while active

- **GIVEN** the timer page is showing a running timer
- **WHEN** time passes on the client while the timer remains active
- **THEN** the rendered `HH:MM:SS` display continues to advance from the running entry start time
- **AND** the page does not require a manual refresh for elapsed time to update

#### Scenario: Manual interval is submitted

- **GIVEN** the user has selected a project and task
- **AND** the manual interval panel has a date, start time, and end time
- **WHEN** the user submits the manual interval
- **THEN** the page creates a completed manual time entry for the selected task
- **AND** the manual interval controls are ready for another entry after a successful submit

#### Scenario: Manual interval conflict with current active timer is surfaced and preserved

- **GIVEN** the user has a current active timer
- **AND** the user submits a manual interval that the API rejects because it conflicts with that active timer
- **WHEN** the manual-entry request fails
- **THEN** the page shows an error toast with the API failure message
- **AND** the page refreshes current timer state before deciding whether the page is idle or running
- **AND** the page keeps the running timer state rendered from the current active entry
- **AND** the page keeps the manual interval inputs available for correction instead of resetting them as if the request had succeeded
- **AND** the manual-entry failure is rendered only in the manual interval panel, not duplicated in the timer CTA error region

#### Scenario: Timer page shows toast feedback for API outcomes

- **WHEN** the page loads or mutates timer-page data through visible-project, task-list, current-timer, start-timer, stop-timer, or manual-entry API calls
- **THEN** failed API calls show an error toast using the repository error-message order (`message`, then `error`, then status fallback)
- **AND** successful start, stop, and manual-entry mutations show a success toast

#### Scenario: Selector state resyncs from the current active timer

- **GIVEN** the page loads or refreshes current timer state
- **WHEN** the API returns a running timer
- **THEN** the page updates the selected project and selected task to match the current active time entry
- **AND** the running timer summary and selector values stay aligned to that authoritative server state

#### Scenario: Start-timer conflict refreshes authoritative current timer state

- **GIVEN** the page appears idle locally
- **WHEN** the user starts a timer and the API rejects the request because a timer is already running
- **THEN** the page shows an error toast with the API failure message
- **AND** the page refreshes current timer state
- **AND** if the refresh returns a running timer, the page renders that active timer and resyncs the project and task selector values from it

#### Scenario: Timer page excludes external-provider-only behavior

- **WHEN** the timer page renders
- **THEN** it does not require GitHub connection state
- **AND** it does not show organization, repository, issue, freeform manual-task fallback, or pause/resume controls

#### Scenario: Stateful timer behavior remains verifiable

- **WHEN** the timer page implementation is updated
- **THEN** stateful behavior such as CTA label switching, project-to-task reset rules, running-timer selector locking, active-timer selector resync, manual interval validation, and active-timer conflict handling remains covered by focused page or composable tests

#### Scenario: Timer page keeps a single feature-state representation

- **WHEN** the timer page composes route-level UI with timer-page behavior
- **THEN** the page keeps one explicit feature-state representation between the composable and the component surface
- **AND** it does not introduce an additional proxy layer only to change template ergonomics

#### Scenario: Timer page fetch boundaries remain aligned with shared transport conventions

- **WHEN** timer-page API helpers are introduced or refactored
- **THEN** they reuse the repository error-message order (`message`, then `error`, then status fallback)
- **AND** any extracted shared fetch helper replaces nearby duplicate request logic instead of becoming an extra transport variant
- **AND** any extracted low-level fetch helper is not exported from the root shared package barrel unless it is intentionally part of the public frontend package contract
- **AND** the fetch boundary has direct tests for request path, headers, payload shape, response parsing, and API error propagation

#### Scenario: Timer page does not land new Vue lint warning debt

- **WHEN** timer-page Vue markup is added or rewritten
- **THEN** auto-fixable lint warnings such as Tailwind class order, Vue attribute order, and formatting warnings are fixed before the timer-page tasks are marked complete
