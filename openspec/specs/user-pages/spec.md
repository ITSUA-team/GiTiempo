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

### Requirement: Global Top-Bar Timer

The user-web authenticated shell MUST expose timer state and task-context selection through a compact top-bar timer surface on tablet and desktop, and through the approved mobile timer strip on mobile authenticated member pages. Timer Start, Stop, and task-change controls MUST be owned by the task-picker popup flow rather than separate header-visible shell action buttons.

#### Scenario: Running timer shown in authenticated top bar

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders at tablet or desktop width
- **THEN** the top bar shows a compact running timer surface with live `HH:MM:SS` and current `Project / Task` in the same two-line surface
- **AND** activating the compact timer surface opens the top-bar timer task picker
- **AND** the top bar does not render a separate visible stop action outside the task-picker popup
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Running timer shown in mobile timer strip

- **GIVEN** the authenticated user has a running timer
- **WHEN** any authenticated user-web page renders below the mobile breakpoint
- **THEN** the mobile timer strip shows a `Task & timer` opener, live `HH:MM:SS`, and current `Project / Task`
- **AND** activating the `Task & timer` opener opens the top-bar timer task picker
- **AND** the strip does not render separate visible stop or task-change actions outside the task-picker popup
- **AND** the opener and elapsed timer state remain available even if the profile menu opens from the top-right identity control
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Idle top-bar timer uses eligible last tracked task

- **GIVEN** the authenticated user has no running timer
- **AND** the user has a most recent own time entry whose task and parent project are still visible and active
- **WHEN** any authenticated user-web page renders
- **THEN** the timer surface shows that last tracked `Project / Task` context
- **AND** activating the compact timer surface or mobile `Task & timer` opener opens the task-picker popup with that context available
- **AND** the popup-owned `Start timer` action creates a fresh running time entry for that task
- **AND** the previous time entry record is not resumed or mutated

#### Scenario: No eligible task keeps picker available

- **GIVEN** the authenticated user has no running timer
- **AND** no recent own time entry resolves to a currently visible active project and active task
- **WHEN** the timer surface renders
- **THEN** the timer surface keeps a no-eligible-task state visible
- **AND** the compact timer surface or mobile `Task & timer` opener remains clickable
- **AND** the popup-owned `Start timer` action is disabled until a valid task context is selected

#### Scenario: Timer summary load failure stays compact

- **WHEN** current timer or timer-summary data fails to load in the authenticated shell
- **THEN** the timer surface keeps the same compact desktop or mobile strip shape visible
- **AND** popup-owned start, stop, and task-change actions are unavailable while the state is not actionable
- **AND** the failure is surfaced through standard toast feedback

#### Scenario: Compact timer surface opens picker dialog

- **WHEN** the user activates the desktop compact timer surface or mobile `Task & timer` opener
- **THEN** a centered task-picker dialog opens
- **AND** the dialog uses visible Project -> Task selection only
- **AND** the dialog does not include manual interval entry controls
- **AND** visible timer Start, Stop, and task-change controls are rendered inside the dialog flow rather than beside the compact shell surface

### Requirement: Global Top-Bar Timer Shows Cross-Workspace Running State

The user-web authenticated shell SHALL keep the authenticated user's authoritative running timer visible after workspace switching, including when the running timer belongs to a different workspace than the active session workspace.

#### Scenario: Cross-workspace running timer shown after workspace switch

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the user switches the active session to workspace B
- **WHEN** any authenticated user-web page renders after the workspace switch completes
- **THEN** the global top-bar timer surface shows the running timer instead of an idle timer state
- **AND** the running timer surface includes live `HH:MM:SS`, project/task context, and a visible label identifying workspace A
- **AND** the elapsed display advances while the timer remains active without requiring a page refresh

#### Scenario: Mobile cross-workspace running timer shown after workspace switch

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the user switches the active session to workspace B
- **WHEN** an authenticated user-web page renders below the mobile breakpoint
- **THEN** the mobile timer strip shows the running timer instead of an idle timer state
- **AND** the strip includes live `HH:MM:SS`, project/task context, and a visible label identifying workspace A
- **AND** the `Task & timer` opener remains available outside the profile menu area

#### Scenario: Cross-workspace running timer opens stop-first picker state

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the active session workspace is workspace B
- **WHEN** the user opens the top-bar timer task picker
- **THEN** the dialog shows that the timer is currently running in workspace A
- **AND** the dialog exposes a popup-owned `Stop timer` action for the running timer
- **AND** active-workspace Project -> Task selection and `Change task` are unavailable until the running timer is stopped

#### Scenario: User stops old workspace timer before starting in active workspace

- **GIVEN** the authenticated user has a running timer in workspace A
- **AND** the active session workspace is workspace B
- **WHEN** the user stops the running timer from the top-bar timer task picker
- **THEN** the app refreshes the authoritative timer state
- **AND** the timer surface returns to the active-workspace idle selection state when no running timer remains
- **AND** the user can then choose a visible workspace B project/task and start a fresh timer in workspace B

#### Scenario: Start attempt conflict refreshes cross-workspace timer state

- **GIVEN** the user-web timer state is stale and appears idle in workspace B
- **AND** the backend has a running timer for the authenticated user in workspace A
- **WHEN** the user attempts to start a timer in workspace B and the backend rejects the request because a timer is already running
- **THEN** the app refreshes the authoritative current timer state
- **AND** the global timer surface shows the workspace A running timer with workspace context
- **AND** the app does not clear the user's active-workspace draft as if the start had succeeded

### Requirement: Top-Bar Timer Task Picker

The user-web top-bar timer task picker MUST allow the user to choose an existing visible task context, append unsynced GitHub issues for visible GitHub-backed projects, add an optional time-entry description, or create a new task inside the selected visible project; MUST remain usable from the mobile timer strip; MUST support popup-owned timer Start and Stop actions; MUST support reassigning the task and description of the currently running timer; and MUST rely on popup dismissal controls instead of a footer `Cancel` button.

#### Scenario: Existing task and description selected for idle timer context

- **GIVEN** the top-bar timer task picker is open
- **AND** no timer is currently running
- **WHEN** the user selects a visible project, one of that project's tasks, and enters a description
- **THEN** the dialog allows starting a fresh timer for the selected task with `Start timer`
- **AND** the top-bar timer context updates to the selected `Project / Task`
- **AND** the start action starts a fresh timer for that task with the submitted description

#### Scenario: Idle timer can start with no description

- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **WHEN** the user selects a visible project and task and leaves Description empty
- **THEN** the dialog allows starting a fresh timer for the selected task with `Start timer`
- **AND** the start action starts a fresh timer for that task with no description

#### Scenario: Running timer task is preselected

- **GIVEN** the authenticated user has a running timer
- **WHEN** the user opens the top-bar timer task picker
- **THEN** the dialog preselects the running timer's current project and task
- **AND** the dialog pre-fills the running timer's current description when one exists
- **AND** loading task options does not clear that preselected task unless the user selects a different project
- **AND** the dialog exposes the running timer's popup-owned `Stop timer` action

#### Scenario: Running timer task and description are reassigned

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different visible active task, changes Description, and confirms the selection with the popup-owned task-change action
- **THEN** the app updates the running time entry to that task and description without stopping the timer
- **AND** the timer surface refreshes from the authoritative current timer state
- **AND** the dialog closes after the refreshed timer state is applied

#### Scenario: Running timer description can be cleared

- **GIVEN** the top-bar timer task picker is open while a running timer has a description
- **WHEN** the user clears Description and confirms with the popup-owned task-change action
- **THEN** the app clears the running entry description without stopping the timer
- **AND** the timer surface refreshes from the authoritative current timer state

#### Scenario: Running timer stops before task reassignment completes

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the timer stops before the selected task update completes successfully
- **THEN** the app treats the task update as a successful correction to the same time entry
- **AND** the timer surface refreshes from the authoritative current timer state
- **AND** the dialog closes even when the refreshed timer state shows no running timer

#### Scenario: Current running task confirmation does not update

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open with the running timer's current task selected
- **WHEN** the user confirms the selected running task
- **THEN** the app does not send a running-entry task update
- **AND** the dialog closes without changing the visible timer context

#### Scenario: Running timer task update failure keeps picker open

- **GIVEN** the authenticated user has a running timer
- **AND** the top-bar timer task picker is open
- **WHEN** the user selects a different task or changes Description and the running-entry update fails
- **THEN** the dialog remains open
- **AND** the dialog shows inline error feedback
- **AND** the visible current task does not switch to the failed selection
- **AND** the dialog inputs remain available for retry unless the refreshed state makes the selection invalid
- **AND** not-found, authorization, validation, visibility, or conflict responses refresh the authoritative timer summary

#### Scenario: New task created inside selected project

- **GIVEN** the top-bar timer task picker is open with a visible project selected
- **WHEN** the user submits a valid new task title
- **THEN** the app creates the task inside the selected project
- **AND** the dialog remains open with the newly created task selected
- **AND** the user can start an idle timer with `Start timer` or confirm a running timer task change through the popup-owned action

#### Scenario: Task picker states remain distinct

- **WHEN** project loading, task loading, empty results, validation failure, or request failure occurs in the task picker
- **THEN** the dialog renders a state specific to that condition
- **AND** failed requests are not collapsed into empty-data messaging

#### Scenario: GitHub-backed project appends unsynced issues in timer picker

- **GIVEN** the top-bar timer task picker is open
- **AND** the user selects a visible active GitHub-backed project
- **WHEN** the project has open GitHub issues that are not yet represented by visible local tasks
- **THEN** the picker keeps visible local tasks available first
- **AND** it appends the unsynced GitHub issue options for that project

#### Scenario: Selected GitHub issue is materialized before timer action

- **GIVEN** the top-bar timer task picker is open
- **AND** the user selects an unsynced GitHub issue option
- **WHEN** the user starts an idle timer or confirms a running-timer task change
- **THEN** the app first requests local task materialization for that issue
- **AND** the subsequent timer start or running-entry update uses the returned local task id

#### Scenario: GitHub suggestion failure stays distinct from empty timer options

- **GIVEN** the top-bar timer task picker is open for a visible active GitHub-backed project
- **WHEN** GitHub issue suggestion loading fails
- **THEN** the picker keeps a request-failure state visible
- **AND** it does not replace that failure with empty-task messaging

#### Scenario: Mobile task picker keeps full-width actions usable

- **GIVEN** the authenticated user opens the task picker from the mobile timer strip `Task & timer` opener
- **WHEN** the task-picker dialog renders below the mobile breakpoint
- **THEN** the dialog uses a near-full-width mobile layout with scrollable content
- **AND** the footer renders the state-appropriate primary action as a full-width button
- **AND** the footer does not render a `Cancel` dismissal button
- **AND** any running-timer `Change task` action remains a secondary full-width domain action rather than a dismissal action
- **AND** the dialog still separates existing task selection and Description from creating a new task inside the selected visible project

#### Scenario: Task picker dismissal uses popup close control

- **GIVEN** the top-bar timer task picker is open and no primary action is submitted
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without changing the selected task context, creating a task, starting a timer, stopping a timer, or updating a running entry

### Requirement: Time Entry Popup Footers

The user-web Time Entries create and edit popups SHALL follow the shared non-destructive popup footer pattern while preserving manual entry save behavior.

#### Scenario: Time-entry create popup footer uses save action only

- **WHEN** the user opens the manual time-entry dialog in create mode from the page-level or day-level create action
- **THEN** the dialog footer shows the primary create-mode save action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Time-entry edit popup footer uses save action only

- **GIVEN** the user views a completed time entry in the Time Entries page
- **WHEN** they open the edit dialog for that entry
- **THEN** the dialog footer shows the primary `Save changes` action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Time-entry popup dismissal uses dialog controls

- **GIVEN** a time-entry create or edit dialog is open
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without creating or updating a time entry
- **AND** failed save attempts still keep the dialog open with pending values available for retry

### Requirement: Time Entries Page Record Management
The Time Entries page MUST allow authenticated users to review, filter, create, edit, and delete their own time entries while keeping manual completed-entry creation out of the global top-bar timer surface, including GitHub-issue selection for visible GitHub-backed projects.

#### Scenario: Page renders approved record-management shell

- **WHEN** an authenticated user opens the Time Entries page
- **THEN** the page renders inside the authenticated shell
- **AND** the top-bar breadcrumb identifies the Time Entries page
- **AND** the page renders date-range, single-project, and task lookup filters above the grouped results region
- **AND** the page does not render a separate page-content text `+ New time entry` opener when the approved design relies on contextual group actions.

#### Scenario: User filters own entries

- **GIVEN** the user is viewing their own time entries
- **WHEN** the user applies date range, project, task search, selected task, or pagination controls
- **THEN** the page requests `GET /time-entries` with the matching shared list query fields
- **AND** task-title search filters the server-side paginated result set through `search`
- **AND** selecting a concrete task option may additionally filter by that task's `taskId`.

#### Scenario: Entries render grouped by day

- **GIVEN** the own-entry list request succeeds with entries across multiple dates
- **WHEN** the page renders results
- **THEN** entries are grouped by their started-at day
- **AND** each day group shows a day heading and a primary icon-only `New time entry` action with explicit tooltip and accessible label copy `New time entry`
- **AND** each entry row shows task, project, time range, duration, edit, and delete affordances according to entry state.

#### Scenario: Running entries stay visible but not editable

- **GIVEN** the own-entry list includes a running entry
- **WHEN** the Time Entries page renders that row
- **THEN** the row is visually highlighted as running
- **AND** the row displays running duration in `HH:MM:SS` format
- **AND** the page does not allow editing or deleting it as a completed manual interval before it is stopped
- **AND** timer stop remains owned by the global top-bar timer.

#### Scenario: Day create opens manual-entry dialog with day preset

- **WHEN** the user activates a day-level primary icon-only `New time entry` action
- **THEN** the page opens the same PrimeVue dialog in create mode
- **AND** the dialog pre-fills the selected day in the started-at and ended-at fields while allowing the user to adjust times
- **AND** the dialog submit action copy remains unchanged.

#### Scenario: Pagination reflects backend metadata

- **GIVEN** the own-entry list response includes pagination metadata
- **WHEN** the page renders pagination
- **THEN** it uses the backend total and current page metadata for the PrimeVue paginator
- **AND** changing page requests the corresponding server-side page without discarding active filters.

#### Scenario: Manual entry dialog appends unsynced GitHub issues

- **GIVEN** the user opens the manual time-entry create or edit dialog
- **AND** the user selects a visible active GitHub-backed project
- **WHEN** the project has open GitHub issues that are not yet represented by visible local tasks
- **THEN** the dialog keeps visible local tasks available first
- **AND** it appends unsynced GitHub issue options for that project

#### Scenario: Manual entry dialog materializes selected GitHub issue before save

- **GIVEN** the user opens the manual time-entry create or edit dialog
- **AND** the selected task option is an unsynced GitHub issue
- **WHEN** the user saves the dialog successfully
- **THEN** the app first requests local task materialization for that issue
- **AND** it creates or updates the time entry with the returned local task id

#### Scenario: Manual entry dialog keeps GitHub suggestion request failure distinct

- **GIVEN** the user opens the manual time-entry create or edit dialog for a visible active GitHub-backed project
- **WHEN** GitHub issue suggestion loading fails
- **THEN** the dialog keeps a request-failure state visible
- **AND** it does not replace that failure with empty-task messaging

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
- **THEN** the section continues to render the existing desktop entry table with task, project, time, duration, and actions columns
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

### Requirement: User Pages Use Browser-Local Timezone Semantics

Member-facing `user-web` pages SHALL use the authenticated user's current browser-local timezone for timestamp labels and calendar-boundary behavior unless a page requirement explicitly defines a different timezone source.

#### Scenario: Dashboard current-week and current-day windows are browser local

- **WHEN** Dashboard stats, weekly focus, or recent-entry labels derive `Today`, `This Week`, or entry time-range context from stored time-entry timestamps
- **THEN** the page uses the user's current browser-local calendar day and browser-local Monday-start week boundaries
- **AND** the page does not derive those user-facing windows from UTC day or UTC ISO-week boundaries

#### Scenario: Time Entries list groups and filters by browser-local calendar days

- **WHEN** the Time Entries page groups rows/cards by day or converts DatePicker day selections into `dateFrom` and `dateTo` query timestamps
- **THEN** it groups entries by the started-at day in the user's current browser-local timezone
- **AND** it converts selected calendar days into browser-local day-start and next-browser-local-day-start ISO boundaries before calling the API

#### Scenario: Day-level create presets use the selected local day

- **WHEN** the user opens the day-level `+ New time entry` action from a rendered day group
- **THEN** the create dialog presets `startedAt` and `endedAt` on that rendered browser-local calendar day
- **AND** it does not seed those presets by treating the selected day key as a UTC midnight boundary

#### Scenario: Profile GitHub timestamps render as local labels

- **WHEN** the Profile page renders `connectedAt` and `updatedAt` from the GitHub connection status contract
- **THEN** it formats those contract timestamps as user-facing labels in the authenticated user's current browser-local timezone
- **AND** it does not render the raw ISO strings directly in the connected account metadata view

### Requirement: User Task Dialog Applies Billable Defaults
The user Projects page task dialog MUST initialize and save task-level default billable state according to the selected project's default and the selected task's current value.

#### Scenario: Task create initializes from project default
- **GIVEN** the user opens the task dialog in create mode for a project
- **AND** the project has `defaultBillableForTasks: false`
- **WHEN** the dialog renders
- **THEN** `Default billable for time entries` is initialized unchecked

#### Scenario: Task create sends selected task default
- **GIVEN** the user opens the task dialog in create mode
- **WHEN** the user saves a valid new task
- **THEN** the page sends the selected `defaultBillableForTimeEntries` value with the task create request

#### Scenario: Task edit initializes from task default
- **GIVEN** the user opens the task dialog in update mode for an existing task
- **WHEN** the dialog renders
- **THEN** `Default billable for time entries` is initialized from the task's `defaultBillableForTimeEntries` value

#### Scenario: Task default edit saves future default immediately
- **GIVEN** the user changes `Default billable for time entries` in task update mode
- **WHEN** the user saves the task dialog
- **THEN** the page sends the new default in the task update request
- **AND** it treats the returned task as the authoritative future-default state

### Requirement: User Task Dialog Prompts For Existing Time Entry Backfill
The user Projects page task dialog MUST show the approved follow-up popup only after a task default billable value has changed and the task already has existing time entries.

#### Scenario: Task follow-up popup appears after saved default change with existing entries
- **GIVEN** a task default billable save succeeds
- **AND** the saved default differs from the previous value
- **AND** the task has existing time entries
- **WHEN** the save flow settles
- **THEN** the page opens a PrimeVue Dialog titled `Update task billable default?`
- **AND** the popup explains that the future default is already saved

#### Scenario: Task follow-up popup offers only time-entry backfill
- **GIVEN** the task follow-up popup is open
- **WHEN** the popup renders
- **THEN** it offers a checkbox choice for updating existing time entries for the task
- **AND** it renders a primary action labeled `Update existing records`
- **AND** it does not render a separate `keep future defaults only` action

#### Scenario: Dismissing task follow-up leaves existing entries unchanged
- **GIVEN** the task follow-up popup is open after the future default was saved
- **WHEN** the user dismisses the popup without choosing the primary action
- **THEN** the page sends no task backfill request
- **AND** existing time entries remain unchanged

#### Scenario: Confirming task follow-up requests time-entry backfill
- **GIVEN** the task follow-up popup is open
- **WHEN** the user selects the existing time-entry choice and activates `Update existing records`
- **THEN** the page calls the task billable-default backfill endpoint
- **AND** success feedback uses the returned update count
- **AND** failure feedback keeps the saved future default visible and does not imply existing entries were updated

### Requirement: User Time Entry Create Uses Task Billable Default
The user Time Entries page manual create dialog MUST initialize new entry billable state from the selected task default while preserving explicit user override before save.

#### Scenario: Manual create initializes from selected task default
- **GIVEN** the user opens the time-entry dialog in create mode
- **AND** the user selects a task with `defaultBillableForTimeEntries: false`
- **WHEN** the task selection becomes active
- **THEN** the `isBillable` checkbox is initialized unchecked

#### Scenario: Manual create allows billable override
- **GIVEN** the time-entry dialog is open in create mode
- **AND** the selected task default initialized `isBillable` unchecked
- **WHEN** the user checks `isBillable` and saves the entry
- **THEN** the page sends `isBillable: true` in the manual time-entry create request

#### Scenario: Time entry edit preserves entry billable value
- **GIVEN** the user opens the time-entry dialog in edit mode
- **WHEN** the selected entry has an existing `isBillable` value
- **THEN** the dialog initializes from the entry value
- **AND** it does not reset the checkbox from the selected task's current default

### Requirement: Top-Bar Timer Uses Task Billable Defaults
The user top-bar timer task picker MUST preserve the project and task default inheritance chain when creating a task from the picker and when starting a timer.

#### Scenario: Timer new task inherits selected project default
- **GIVEN** the top-bar timer task picker is open
- **AND** the user selects a project with `defaultBillableForTasks: false`
- **WHEN** the user creates a new task from the picker
- **THEN** the task create request omits an override or sends `defaultBillableForTimeEntries: false`
- **AND** the created task remains selected in the picker

#### Scenario: Timer start uses selected task default
- **GIVEN** the top-bar timer task picker is open while the timer is idle
- **AND** the selected task has `defaultBillableForTimeEntries: false`
- **WHEN** the user starts the timer
- **THEN** the timer start request does not send an entry-level billable override
- **AND** the returned running entry reflects the backend-inherited `isBillable: false` value
