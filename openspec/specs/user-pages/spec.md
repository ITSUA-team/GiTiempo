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

### Requirement: Global Top-Bar Timer

The user-web authenticated shell MUST expose timer start, stop, and task-context selection through a compact top-bar timer surface on every authenticated member page.

#### Scenario: Running timer shown in authenticated top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders
- **THEN** the top bar shows a compact running timer surface with live `HH:MM:SS`, current `Project / Task`, a clickable task information field, and one stop action
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Idle top-bar timer uses eligible last tracked task

- **GIVEN** the authenticated user has no running timer
- **AND** the user has a most recent own time entry whose task and parent project are still visible and active
- **WHEN** any authenticated user-web page renders
- **THEN** the top bar shows that last tracked `Project / Task` context
- **AND** the top bar start action creates a fresh running time entry for that task
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: No eligible task keeps picker available

- **GIVEN** the authenticated user has no running timer
- **AND** no recent own time entry resolves to a currently visible active project and active task
- **WHEN** the top-bar timer renders
- **THEN** the top bar keeps the compact timer surface visible in a no-eligible-task state
- **AND** the task information field remains clickable
- **AND** the start action is disabled until a valid task context is selected

#### Scenario: Timer summary load failure stays compact

- **WHEN** current timer or timer-summary data fails to load in the authenticated shell
- **THEN** the top-bar timer keeps the same compact surface shape visible
- **AND** the start or stop action is disabled while the state is not actionable
- **AND** the failure is surfaced through standard toast feedback

#### Scenario: Task information opens picker dialog

- **WHEN** the user activates the top-bar task information field
- **THEN** a centered task-picker dialog opens
- **AND** the dialog uses visible Project -> Task selection only
- **AND** the dialog does not include manual interval entry controls

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context or create a new task inside the selected visible project.

#### Scenario: Existing task selected for timer context

- **GIVEN** the top-bar timer task picker is open
- **WHEN** the user selects a visible project and one of that project's tasks
- **THEN** the dialog allows confirmation with `Use selected task`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** a subsequent idle start action starts a fresh timer for that task

#### Scenario: New task created inside selected project

- **GIVEN** the top-bar timer task picker is open with a visible project selected
- **WHEN** the user submits a valid new task title
- **THEN** the app creates the task inside the selected project
- **AND** the dialog remains open with the newly created task selected
- **AND** the user can confirm the context with `Use selected task`

#### Scenario: Task picker states remain distinct

- **WHEN** project loading, task loading, empty results, validation failure, or request failure occurs in the task picker
- **THEN** the dialog renders a state specific to that condition
- **AND** failed requests are not collapsed into empty-data messaging

### Requirement: Time Entries Page Record Management

The Time Entries page MUST own manual time-entry creation for authenticated users instead of the removed dedicated timer page.

#### Scenario: Manual entry stays on Time Entries

- **WHEN** the user needs to create a completed manual time entry
- **THEN** the create flow is owned by the Time Entries page rather than the top-bar timer or task-picker dialog
- **AND** the top-bar timer change does not move manual interval controls into shell chrome

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own completed entries through a shared dialog surface.

#### Scenario: Dialog edit for a time entry

- GIVEN the user views their time entries list
- WHEN they choose to edit one completed entry
- THEN the edit interaction opens in a PrimeVue dialog
- AND the dialog pre-fills the selected entry's project, task, started-at, ended-at, description, and billable state
- AND saving valid changes updates the entry, closes or resets the dialog according to the page flow, refreshes the list, and shows toast feedback

#### Scenario: Running entry is not editable before stop

- GIVEN the user views a running time entry in the Time Entries page
- WHEN edit controls are rendered for that entry
- THEN the page does not allow editing it as a completed manual interval
- AND the user can stop the running timer from the global top-bar timer instead

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
