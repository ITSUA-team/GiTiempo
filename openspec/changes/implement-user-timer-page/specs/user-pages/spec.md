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

#### Scenario: Timer CTA label follows running state

- **GIVEN** the timer page renders
- **WHEN** no timer is running
- **THEN** the singular timer CTA is labeled `Start`
- **AND** when a timer is running, the singular timer CTA is labeled `Stop`

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
