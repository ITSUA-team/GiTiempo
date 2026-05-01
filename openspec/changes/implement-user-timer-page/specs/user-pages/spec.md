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

#### Scenario: Timer page excludes external-provider-only behavior

- **WHEN** the timer page renders
- **THEN** it does not require GitHub connection state
- **AND** it does not show organization, repository, issue, freeform manual-task fallback, or pause/resume controls

#### Scenario: Stateful timer behavior remains verifiable

- **WHEN** the timer page implementation is updated
- **THEN** stateful behavior such as CTA label switching, project-to-task reset rules, running-timer selector locking, and manual interval validation remains covered by focused page or composable tests

#### Scenario: Timer page keeps a single feature-state representation

- **WHEN** the timer page composes route-level UI with timer-page behavior
- **THEN** the page keeps one explicit feature-state representation between the composable and the component surface
- **AND** it does not introduce an additional proxy layer only to change template ergonomics

#### Scenario: Timer page fetch boundaries remain aligned with shared transport conventions

- **WHEN** timer-page API helpers are introduced or refactored
- **THEN** they reuse the repository error-message order (`message`, then `error`, then status fallback)
- **AND** any extracted shared fetch helper replaces nearby duplicate request logic instead of becoming an extra transport variant
- **AND** the fetch boundary has direct tests for request path, headers, payload shape, response parsing, and API error propagation
