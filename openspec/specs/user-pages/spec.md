# Frontend User Pages Specification

## Purpose

Define user-facing SPA behavior for the member-oriented pages in `user-web`.

## Requirements

### Requirement: Login Entry Page

The user-web app MUST provide a dedicated login page that matches the approved entry design and exposes the supported authentication methods.

#### Scenario: Login page renders approved entry sections

- **WHEN** an anonymous user opens the login route
- **THEN** the page shows the branded hero content panel and the sign-in form panel
- **AND** the sign-in form includes email and password entry, a primary sign-in action, and a Google continuation action

### Requirement: Authenticated Page Entry Expectations

Each member-facing page in the user-web app MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route.

#### Scenario: Member page loads through authenticated route tree

- **WHEN** a user opens any member-facing page in the user-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

### Requirement: User Dashboard Overview

The user dashboard SHALL expose the active timer state and recent time-entry activity.

#### Scenario: Dashboard with running timer

- GIVEN the user has a running timer
- WHEN the dashboard loads
- THEN the page shows the active timer widget prominently
- AND the page includes the stop action for that timer

#### Scenario: Dashboard with no recent data

- GIVEN the user has no recent time entries or active timer
- WHEN the dashboard loads
- THEN the dashboard uses the shared empty-state pattern for the missing sections

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

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own entries inline.

#### Scenario: Inline edit for a time entry

- GIVEN the user views their time entries list
- WHEN they choose to edit one entry
- THEN the edit interaction opens inline within the row
- AND the page does not require a modal for that edit flow

### Requirement: Profile Identity Surface

The profile page MUST expose editable profile information, API-backed GitHub connection state, and sign-out access.

#### Scenario: Profile page shows connection card

- GIVEN the user opens their profile page
- WHEN the page renders
- THEN it shows the editable display-name surface
- AND it shows the GitHub connection state card
- AND it provides a sign-out action

#### Scenario: Profile display name surface is interactive

- **GIVEN** an authenticated user opens the Profile page
- **WHEN** the page renders the identity form
- **THEN** the display-name input is enabled with the current display name value
- **AND** the page does not treat permanently disabled Save/Cancel placeholder controls as a completed editable surface

#### Scenario: Profile saves an updated display name

- **GIVEN** an authenticated user edits their display name on the Profile page
- **WHEN** they submit a valid new display name
- **THEN** the page calls `PATCH /users/me`
- **AND** the page updates the rendered profile identity from the authoritative API response
- **AND** the page shows a success toast notification

#### Scenario: Profile cancels a pending display name edit

- **GIVEN** an authenticated user has unsaved display-name changes on the Profile page
- **WHEN** they activate `Cancel`
- **THEN** the page restores the latest persisted display name value
- **AND** the page exits the dirty editing state without calling `PATCH /users/me`

#### Scenario: Profile display name save failure stays retryable

- **GIVEN** an authenticated user submits a display-name change
- **WHEN** the `PATCH /users/me` request fails
- **THEN** the page shows an error toast using the repository error-message order
- **AND** the page keeps the identity form editable for retry
- **AND** the page does not present the failed request as saved state

#### Scenario: Profile GitHub connection status loads from API

- **GIVEN** an authenticated user opens the Profile page
- **WHEN** the GitHub connection status request is pending
- **THEN** the page renders the GitHub connection loading state
- **AND** the loading state uses the shared PrimeVue loading component pattern

#### Scenario: Profile GitHub connected state shows contract fields

- **GIVEN** the GitHub connection status API returns `status: "connected"`
- **WHEN** the Profile page renders the GitHub connection card
- **THEN** the card shows `githubUserId`, `login`, `avatarUrl`, `connectedAt`, and `updatedAt` from the shared API contract
- **AND** the card shows `Reconnect` and `Disconnect` actions
- **AND** the card does not show fields outside the GitHub connection status contract as account metadata

#### Scenario: Profile GitHub connected state omits null avatar

- **GIVEN** the GitHub connection status API returns `status: "connected"` with `account.avatarUrl` set to `null`
- **WHEN** the Profile page renders the connected GitHub card
- **THEN** the card does not render the avatar row
- **AND** the card does not render initials or a custom avatar placeholder for the missing GitHub avatar

#### Scenario: Profile GitHub disconnected state follows approved actions

- **GIVEN** the GitHub connection status API returns `status: "disconnected"`
- **WHEN** the Profile page renders the GitHub connection card
- **THEN** the card renders the disconnected state
- **AND** the primary available action is `Connect GitHub`
- **AND** the card does not render connected account metadata fields

#### Scenario: Profile GitHub request error stays distinct

- **GIVEN** the GitHub connection status request fails
- **WHEN** the Profile page renders the GitHub connection card
- **THEN** the card renders the request-error state
- **AND** the page shows an error toast using the repository error-message order
- **AND** the page does not collapse the failure into the disconnected state

#### Scenario: Profile starts GitHub OAuth connection

- **GIVEN** the Profile page renders a disconnected or reconnectable GitHub connection card
- **WHEN** the user activates `Connect GitHub` or `Reconnect`
- **THEN** the page requests a GitHub authorization URL from the API
- **AND** the card renders the redirecting/connecting state while the request is pending
- **AND** the browser navigates to the returned authorization URL after the request succeeds
- **AND** request failure is surfaced with an error toast and returns the card to a retryable state

#### Scenario: Profile disconnects GitHub with confirmation

- **GIVEN** the Profile page renders a connected GitHub connection card
- **WHEN** the user activates `Disconnect`
- **THEN** the page asks for confirmation using the standard PrimeVue confirmation dialog pattern
- **AND** accepting the confirmation calls the GitHub disconnect API
- **AND** successful disconnect refetches `GET /github/connection` before settling the card state
- **AND** the refreshed card settles to the disconnected state
- **AND** successful disconnect shows a success toast notification
- **AND** failed disconnect keeps the previous connection state and shows an error toast

#### Scenario: Profile GitHub connect request fails before redirect

- **GIVEN** the Profile page renders a disconnected or reconnectable GitHub connection card
- **WHEN** the GitHub authorization URL request fails
- **THEN** the page shows an error toast using the repository error-message order
- **AND** the card exits the redirecting/connecting state
- **AND** the page leaves the user in a retryable state instead of navigating away

#### Scenario: Profile connecting state does not add a transient cancel action

- **GIVEN** the Profile page is rendering the redirecting/connecting state after a GitHub auth-url request starts
- **WHEN** the connection request is still pending
- **THEN** the page does not introduce a separate `Cancel` action for that transient state
- **AND** the state resolves by either navigating to the returned authorization URL or returning to a retryable state after a request failure

#### Scenario: Profile handles GitHub callback query outcome

- **GIVEN** GitHub redirects the user back to `/profile` with a safe callback outcome query using `github` as the outcome key
- **AND** the supported callback outcome values for `github` are `connected` and `error`
- **AND** when `github=error`, the callback also includes a safe `code` query key whose value is a backend-defined safe error enum
- **WHEN** the Profile page initializes
- **THEN** the page surfaces the outcome with a standard PrimeVue toast notification only
- **AND** the page does not render an inline success or error banner for the callback outcome
- **AND** the handled callback query parameters are removed from the URL without adding another history entry

#### Scenario: Profile handles supported callback success value

- **GIVEN** GitHub redirects the user back to `/profile` with `github=connected`
- **WHEN** the Profile page initializes
- **THEN** the page treats the callback as a supported success outcome
- **AND** the page shows the callback success through a toast notification only

#### Scenario: Profile callback success can still fall back to request-error state

- **GIVEN** GitHub redirects the user back to `/profile` with `github=connected`
- **AND** the follow-up `GET /github/connection` request fails
- **WHEN** the Profile page initializes
- **THEN** the page still surfaces the callback success with a toast notification
- **AND** the handled callback query parameters are removed from the URL without adding another history entry
- **AND** the GitHub connection surface settles into the request-error state instead of collapsing into disconnected

#### Scenario: Profile handles GitHub callback error outcome

- **GIVEN** GitHub redirects the user back to `/profile` with `github=error`
- **AND** the callback may include a safe `code` query value such as `invalid_state`, `github_exchange_failed`, or `github_config`
- **WHEN** the Profile page initializes
- **THEN** the page surfaces the error with a standard PrimeVue error toast notification only
- **AND** the page does not render an inline error banner for the callback outcome
- **AND** the handled callback query parameters are removed from the URL without adding another history entry

#### Scenario: Profile uses generic error toast for unknown callback code

- **GIVEN** GitHub redirects the user back to `/profile` with `github=error`
- **AND** the callback includes an unknown safe `code` value or omits `code`
- **WHEN** the Profile page initializes
- **THEN** the page still surfaces the callback as a standard PrimeVue error toast notification
- **AND** the page may fall back to generic GitHub connection failure copy instead of code-specific wording

#### Scenario: Profile ignores unsupported callback query values

- **GIVEN** the Profile page initializes with callback-like query parameters that do not match the supported `github` values or expected `code` pairing
- **WHEN** the page evaluates the route query
- **THEN** the page does not show a callback toast for the unsupported values
- **AND** the page does not treat the unsupported values as a successful or failed GitHub callback outcome

#### Scenario: Profile feature boundaries stay scoped

- **WHEN** the Profile page implementation is updated
- **THEN** GitHub connection state and actions remain scoped to the GitHub connection feature surface
- **AND** editable current-user identity behavior remains scoped to the current-user identity surface
- **AND** the page does not introduce a second overlapping `/users/me` client boundary when an existing current-user client already owns that endpoint family
- **AND** unrelated Profile sections are not merged into a single broad composable without a concrete shared state or lifecycle requirement

#### Scenario: Profile destructive confirmation host stays page-scoped

- **WHEN** the Profile page renders GitHub disconnect confirmation behavior
- **THEN** the page uses the standard PrimeVue confirmation dialog pattern
- **AND** the rendered `<ConfirmDialog>` host stays at the route, page-shell, or app-shell level
- **AND** the implementation does not hide the confirmation host inside a leaf presentational card or field component

#### Scenario: Profile route header follows the documented shared pattern

- **WHEN** the Profile route renders its page title and subtitle
- **THEN** it follows the documented page-header structure for user-web route views
- **AND** the implementation reuses an existing app-local/shared header owner when that pattern already exists in the app instead of introducing a new one-off header markup variant

#### Scenario: Profile route view wiring remains verifiable

- **WHEN** the Profile page composes the identity surface, GitHub connection surface, and sign-out action
- **THEN** at least one focused view-level or feature-integration test covers the user-visible wiring between the route view and those feature surfaces
- **AND** transport-boundary or composable-only tests do not count as sufficient proof of the assembled Profile page behavior by themselves

#### Scenario: Profile GitHub states remain verifiable

- **WHEN** the Profile GitHub connection UI is implemented or updated
- **THEN** fetch-boundary behavior is covered for request paths, auth headers, response parsing, and API error propagation
- **AND** the editable display-name surface is covered for save success, save failure, and cancel/reset behavior
- **AND** page or composable tests cover loading, request-error, disconnected, connected, redirecting/connecting, callback success toast, callback error toast, callback-success-followed-by-fetch-failure, connect failure, disconnect success, and disconnect failure behavior
- **AND** frontend lint and typecheck pass for user-web
