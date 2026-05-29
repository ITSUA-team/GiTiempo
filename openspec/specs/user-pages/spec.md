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

Each member-facing product page in the user-web app MUST assume an authenticated shell-owned entry path instead of serving as a public first-load route. Route-level 403 and 404 pages are standalone authenticated error-page exceptions to this shell-owned page-entry rule.

#### Scenario: Member product page loads through authenticated route tree

- **WHEN** a user opens a dashboard, time entries, project view, or profile page in the user-web app
- **THEN** the page is reached through the authenticated route tree
- **AND** the page receives shared shell chrome instead of defining standalone public entry behavior

#### Scenario: Route-level error page stays outside shell chrome

- **WHEN** an authenticated user reaches a user-web route-level 403 or 404 page
- **THEN** the page remains part of the authenticated route tree
- **AND** the page may render as a standalone error surface without shared shell chrome

### Requirement: User Dashboard Overview

The user dashboard SHALL provide an authenticated overview page focused on weekly insight, recent entries, and optional summary stats, while relying on the global top-bar timer for timer controls.

#### Scenario: Dashboard renders approved overview content

- WHEN the dashboard loads
- THEN the page shows weekly insight content and recent time-entry activity
- AND the page may include optional stats cards or panels when data is available
- AND the page does not render a page-content timer widget or stop control

#### Scenario: Running timer ownership stays in global top bar

- GIVEN the authenticated user has a running timer
- WHEN the dashboard loads
- THEN the dashboard does not provide timer stop controls in page content
- AND the running timer is managed through the global top-bar timer surface

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
- AND the failure is surfaced without turning the page into a timer-control surface

### Requirement: Global Top-Bar Timer

The user-web authenticated shell MUST expose timer start, stop, and task-context selection through a compact top-bar timer surface on tablet and desktop, and through the approved mobile timer strip on mobile authenticated member pages.

#### Scenario: Running timer shown in authenticated top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders at tablet or desktop width
- **THEN** the top bar shows a compact running timer surface with live `HH:MM:SS`, current `Project / Task`, a clickable task information field, and one stop action
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Running timer shown in mobile timer strip

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders below the mobile breakpoint
- **THEN** the mobile timer strip shows live `HH:MM:SS`, current `Project / Task`, a task-change affordance, and one stop action
- **AND** the stop action and task-change affordance remain available even if the profile menu opens from the top-right identity control
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Idle top-bar timer uses eligible last tracked task

- **GIVEN** the authenticated user has no running timer
- **AND** the user has a most recent own time entry whose task and parent project are still visible and active
- **WHEN** any authenticated user-web page renders
- **THEN** the timer surface shows that last tracked `Project / Task` context
- **AND** the start action creates a fresh running time entry for that task
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: No eligible task keeps picker available

- **GIVEN** the authenticated user has no running timer
- **AND** no recent own time entry resolves to a currently visible active project and active task
- **WHEN** the timer surface renders
- **THEN** the timer surface keeps a no-eligible-task state visible
- **AND** the task information or task-change affordance remains clickable
- **AND** the start action is disabled until a valid task context is selected

#### Scenario: Timer summary load failure stays compact

- **WHEN** current timer or timer-summary data fails to load in the authenticated shell
- **THEN** the timer surface keeps the same compact desktop or mobile strip shape visible
- **AND** the start or stop action is disabled while the state is not actionable
- **AND** the failure is surfaced through standard toast feedback

#### Scenario: Task information opens picker dialog

- **WHEN** the user activates the timer task information field or mobile task-change affordance
- **THEN** a centered task-picker dialog opens
- **AND** the dialog uses visible Project -> Task selection only
- **AND** the dialog does not include manual interval entry controls

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context or create a new task inside the selected visible project, and MUST remain usable from the mobile timer strip.

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

#### Scenario: Mobile task picker keeps full-width actions usable

- **GIVEN** the authenticated user opens the task picker from the mobile timer strip Change affordance
- **WHEN** the task-picker dialog renders below the mobile breakpoint
- **THEN** the dialog uses a near-full-width mobile layout with scrollable content
- **AND** the footer actions render as full-width stacked buttons
- **AND** `Use selected task` renders before `Cancel` in the mobile stacked button and keyboard order
- **AND** the dialog still separates existing task selection from creating a new task inside the selected visible project

### Requirement: Time Entries Page Record Management

The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface.

#### Scenario: Page renders approved record-management shell

- **WHEN** an authenticated user opens the Time Entries page
- **THEN** the page renders inside the authenticated shell
- **AND** the header shows the Time Entries title, descriptive subtitle, and a primary `+ New time entry` action
- **AND** the page renders date-range, single-project, and task lookup filters above the grouped results region

#### Scenario: User filters own entries

- **GIVEN** the user is viewing their own time entries
- **WHEN** the user applies date range, project, task search, selected task, or pagination controls
- **THEN** the page requests `GET /time-entries` with the matching shared list query fields
- **AND** task-title search filters the server-side paginated result set through `search`
- **AND** selecting a concrete task option may additionally filter by that task's `taskId`

#### Scenario: Entries render grouped by day

- **GIVEN** the own-entry list request succeeds with entries across multiple dates
- **WHEN** the page renders results
- **THEN** entries are grouped by their started-at day
- **AND** each day group shows a day heading and a day-level `+ New time entry` action
- **AND** each entry row shows task, project, time range, duration, edit, and delete affordances according to entry state

#### Scenario: Running entries stay visible but not editable

- **GIVEN** the own-entry list includes a running entry
- **WHEN** the Time Entries page renders that row
- **THEN** the row is visually highlighted as running
- **AND** the row displays running duration in `HH:MM:SS` format
- **AND** the page does not allow editing or deleting it as a completed manual interval before it is stopped
- **AND** timer stop remains owned by the global top-bar timer

#### Scenario: Header create opens manual-entry dialog

- **WHEN** the user activates the page-level `+ New time entry` action
- **THEN** the page opens a PrimeVue dialog in create mode without a preset day
- **AND** the dialog creates a completed manual time entry instead of starting or resuming a running timer

#### Scenario: Day create opens manual-entry dialog with day preset

- **WHEN** the user activates a day-level `+ New time entry` action
- **THEN** the page opens the same PrimeVue dialog in create mode
- **AND** the dialog pre-fills the selected day in the started-at and ended-at fields while allowing the user to adjust times

#### Scenario: Pagination reflects backend metadata

- **GIVEN** the own-entry list response includes pagination metadata
- **WHEN** the page renders pagination
- **THEN** it uses the backend total and current page metadata for the PrimeVue paginator
- **AND** changing page requests the corresponding server-side page without discarding active filters

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own completed entries through a shared dialog surface.

#### Scenario: Dialog edit for a time entry

- **GIVEN** the user views their time entries list
- **WHEN** they choose to edit one completed entry
- **THEN** the edit interaction opens in a PrimeVue dialog
- **AND** the dialog pre-fills the selected entry's project, task, started-at, ended-at, description, and billable state
- **AND** saving valid changes updates the entry, closes or resets the dialog according to the page flow, refreshes the list, and shows toast feedback

#### Scenario: Edit dialog uses approved field order

- **WHEN** the create or edit time-entry dialog renders
- **THEN** it renders project, task, started-at, ended-at, description, and billable fields in the approved order
- **AND** project uses a PrimeVue Select, task uses a PrimeVue AutoComplete, dates use PrimeVue DatePicker with time, description uses PrimeVue Textarea, and billable uses a binary PrimeVue Checkbox

#### Scenario: Completed entry can move to a different visible task

- **GIVEN** the user edits a completed own time entry
- **WHEN** the user selects a different visible active project and task and saves
- **THEN** the page submits the selected task identifier in the update request
- **AND** the refreshed row reflects the updated project and task display context

#### Scenario: Running entry is not editable before stop

- **GIVEN** the user views a running time entry in the Time Entries page
- **WHEN** edit controls are rendered for that entry
- **THEN** the page does not allow editing it as a completed manual interval
- **AND** the user can stop the running timer from the global top-bar timer instead

#### Scenario: Edit failures stay retryable

- **GIVEN** the user has changed values in the edit dialog
- **WHEN** the update request fails validation, authorization, visibility, or conflict checks
- **THEN** the dialog remains open with the user's pending values available for correction
- **AND** the page shows error toast feedback using the repository error-message order

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

### Requirement: User Record Lists Adapt To Mobile Cards
User-web record-list surfaces SHALL preserve desktop table rendering on tablet and desktop viewports while rendering mobile-readable stacked record cards below the documented mobile breakpoint.

#### Scenario: Dashboard recent entries render mobile cards
- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders below the mobile breakpoint
- **THEN** the recent entries section renders one stacked card per recent entry instead of the fixed-width desktop table
- **AND** each card shows the entry task title, project name, time range, duration, and highlighted running/current-entry state when applicable
- **AND** the `View all` action remains available from the recent entries section

#### Scenario: Dashboard recent entries preserve desktop table
- **GIVEN** the Dashboard recent time entries section has recent entry rows
- **WHEN** the page renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop table with task, project, range, and duration columns

#### Scenario: Time entry day sections render mobile cards
- **GIVEN** the Time Entries page has a day group with own time entries
- **WHEN** the day section renders below the mobile breakpoint
- **THEN** the section renders one stacked card per time entry instead of the fixed-width desktop entry table
- **AND** each card shows the task title, optional description, project name, time range, duration, and running-entry highlight when applicable
- **AND** completed entries expose icon-only `Edit` and `Delete` actions with accessible labels
- **AND** running entries do not expose edit or delete actions and continue to direct stopping to the global top-bar timer

#### Scenario: Time entry day sections preserve desktop table
- **GIVEN** the Time Entries page has a day group with own time entries
- **WHEN** the day section renders at or above the mobile breakpoint
- **THEN** the section continues to render the existing desktop entry table with task, project, time, duration, and actions columns
