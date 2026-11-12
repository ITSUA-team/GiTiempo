# Spec Delta

## MODIFIED Requirements

### Requirement: Time Entries Editing Flow

The time entries page SHALL allow the user to review and edit their own completed entries through a shared dialog surface.

#### Scenario: Dialog edit for a time entry

- **GIVEN** the user views their time entries list
- **WHEN** they choose to edit one completed entry
- **THEN** the edit interaction opens in a PrimeVue dialog
- **AND** the dialog pre-fills the selected entry's project, task, started-at, ended-at, description, and billable state
- **AND** saving valid changes updates the entry, closes or resets the dialog according to the page flow, refreshes or reconciles the list without a redundant success/info notification

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
- **AND** the page does not show a redundant success/info notification

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
- **AND** the card shows OAuth permission recovery and a separate personal App data authorization action according to their capabilities
- **AND** it shows `Disconnect` with server-derived eligibility and guidance when another sign-in method is required
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
- **THEN** the page requests an OAuth account-link authorization URL from the API with user:email, read:org and read:project
- **AND** the card renders the redirecting/connecting state while the request is pending
- **AND** the browser navigates to the returned authorization URL after the request succeeds
- **AND** request failure is surfaced with an error toast and returns the card to a retryable state

#### Scenario: Profile disconnects GitHub with confirmation

- **GIVEN** the Profile page renders a connected GitHub connection card
- **WHEN** the user activates `Disconnect`
- **THEN** the page asks for confirmation using the standard PrimeVue confirmation dialog pattern
- **AND** the confirmation explains removal of GitHub login and personal access while preserving workspace installations and historical data
- **AND** accepting the confirmation calls the full GitHub disconnect API only when server-derived eligibility allows it
- **AND** successful disconnect refetches `GET /github/connection` before settling the card state
- **AND** the refreshed card settles to the disconnected state
- **AND** successful disconnect does not show a redundant success/info notification
- **AND** rejected unlink keeps the previous connection state and shows an error toast
- **AND** completed local unlink with unconfirmed provider revocation settles to disconnected and shows a safe warning

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
- **THEN** supported success is handled quietly and supported failure uses a standard PrimeVue error toast
- **AND** the page does not render an inline success or error banner for the callback outcome
- **AND** the handled callback query parameters are removed from the URL without adding another history entry

#### Scenario: Profile handles supported callback success value

- **GIVEN** GitHub redirects the user back to `/profile` with `github=connected`
- **WHEN** the Profile page initializes
- **THEN** the page treats the callback as a supported success outcome
- **AND** the ordinary authoritative status load renders the connection card without a success toast or inline success banner

#### Scenario: Profile callback success can still fall back to request-error state

- **GIVEN** GitHub redirects the user back to `/profile` with `github=connected`
- **AND** the follow-up `GET /github/connection` request fails
- **WHEN** the Profile page initializes
- **THEN** the page handles the callback quietly and preserves actionable feedback for the status-load failure
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
- **AND** page or composable tests cover loading, request-error, disconnected, connected, redirecting/connecting, quiet callback success with URL cleanup, callback error toast, callback-success-followed-by-fetch-failure with URL cleanup, connect failure, disconnect success, and disconnect failure behavior
- **AND** frontend lint and typecheck pass for user-web

#### Scenario: OAuth login already linked the account
- **GIVEN** the user successfully signed in through GitHub
- **WHEN** Profile loads authoritative connection status
- **THEN** the page SHALL display the linked identity without asking for duplicate account linking
- **AND** it SHALL still distinguish missing OAuth permissions and missing personal App data authorization

#### Scenario: Personal App authorization is a separate action
- **GIVEN** an identity is linked but its personal App data grant is absent or invalid
- **WHEN** the user chooses to enable GitHub data access
- **THEN** the page SHALL start the existing App authorization flow
- **AND** it SHALL explain that OAuth identity alone does not enable private browsing

#### Scenario: Disconnect cannot remove the only login method
- **GIVEN** server status reports alternative_signin_required or verification_unavailable
- **WHEN** the user opens the GitHub card
- **THEN** the page SHALL explain the required alternative login or retry action
- **AND** it MUST NOT present full unlink as available until eligibility is verified

#### Scenario: Missing OAuth project consent does not disable App Projects
- **GIVEN** OAuth lacks read:project but the personal App grant permits Projects access
- **WHEN** the UI renders GitHub controls
- **THEN** the page SHALL offer OAuth permission recovery
- **AND** it MUST NOT disable existing App-backed Projects solely because that OAuth scope is absent

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
- **THEN** the app reconciles visible Dashboard timer and entry state without a redundant success/info notification
- **AND** failed direct starts or stops show an error toast using the backend or client error message
