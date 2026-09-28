## MODIFIED Requirements

### Requirement: Extension Detects GitHub Issue Context
The extension SHALL detect supported GitHub issue surfaces and derive the local timer request context from the current page.

#### Scenario: Supported GitHub issue URL is parsed
- **GIVEN** the active URL is `https://github.com/<owner>/<repo>/issues/<number>`
- **WHEN** the extension evaluates the page context
- **THEN** it derives `githubRepo` as `<owner>/<repo>`
- **AND** it derives `issueNumber` as the numeric issue number

#### Scenario: Supported GitHub Projects issue pane URL is parsed
- **GIVEN** the active URL is a GitHub Projects pane URL with `pane=issue`
- **AND** the URL contains `issue=<owner>|<repo>|<number>`
- **WHEN** the extension evaluates the page context
- **THEN** it derives `githubRepo` as `<owner>/<repo>`
- **AND** it derives `issueNumber` as the numeric issue number

#### Scenario: Malformed GitHub Projects issue pane URL is unsupported
- **GIVEN** the active URL is a GitHub Projects page
- **AND** the URL is missing `pane=issue`, missing the `issue` query value, or contains a non-numeric issue number
- **WHEN** the extension evaluates the page context
- **THEN** timer start actions that require issue metadata are unavailable
- **AND** the page is treated as unsupported issue context

#### Scenario: Issue title is detected from page content
- **GIVEN** the active tab is a supported GitHub issue surface
- **WHEN** the extension prepares a timer start request
- **THEN** it uses the detected title only for local display and sends repository and issue identifiers for server verification
- **AND** it uses a safe fallback or retryable error when the title cannot be determined

#### Scenario: Unsupported page disables issue actions
- **GIVEN** the active tab is not a supported GitHub issue surface
- **WHEN** the popup or content script evaluates page context
- **THEN** timer start actions that require issue metadata are unavailable
- **AND** the user receives concise guidance that a supported GitHub issue is required
- **AND** the popup keeps its branded shell and may keep a link to the full GiTiempo workspace

### Requirement: Injected Issue Control Manages Timer State
The extension SHALL inject a page-local timer control into supported GitHub issue surfaces and keep its state aligned with the authenticated user's current timer.

#### Scenario: Injected control mounts at the start of direct issue main content
- **GIVEN** the active tab is a supported direct GitHub issue page
- **WHEN** the content script mounts the injected control
- **THEN** it inserts the control at the start of the page `main` content container
- **AND** the control remains page-local rather than rendering as a floating overlay

#### Scenario: Injected control mounts above Projects issue pane sticky header
- **GIVEN** the active tab is a supported GitHub Projects issue pane
- **WHEN** the content script mounts the injected control
- **THEN** it inserts the control immediately above the element with id `issue-viewer-sticky-header`
- **AND** it uses tighter vertical spacing than the direct issue-page injected control
- **AND** the control remains page-local rather than rendering as a floating overlay

#### Scenario: Injected control waits for Projects pane mount target
- **GIVEN** the active tab is a supported GitHub Projects issue pane
- **AND** the element with id `issue-viewer-sticky-header` is not yet present
- **WHEN** the content script evaluates the page context
- **THEN** it does not inject the control into a fallback location
- **AND** it mounts the control above `#issue-viewer-sticky-header` after that element becomes available

#### Scenario: Injected control remounts after GitHub rerender
- **GIVEN** the injected control is mounted on a supported GitHub issue surface
- **AND** GitHub navigation or DOM rerender removes the injected host or replaces the mount target
- **WHEN** the content script observes the page change
- **THEN** it re-evaluates the current issue context
- **AND** it remounts the control in the correct surface-specific location when the page remains supported
- **AND** it unmounts the control when the page no longer has supported issue context

#### Scenario: Injected idle control starts timer
- **GIVEN** the user is authenticated
- **AND** the GitHub issue surface has no running timer for the current user
- **WHEN** the user clicks `Start Timer` in the injected control
- **THEN** the extension calls `POST /time-entries/timer/start-from-github` with `githubRepo` and `issueNumber`, plus an optional supported `githubProjectId` hint
- **AND** the control transitions to a running state after success

#### Scenario: Injected running control stops timer for the matching GitHub issue
- **GIVEN** the user is authenticated
- **AND** the API reports a running timer with stable GitHub issue linkage matching the current page
- **WHEN** the user clicks `Stop Timer` in the injected control
- **THEN** the extension calls `POST /time-entries/timer/stop`
- **AND** the control returns to an idle state after success

#### Scenario: Injected control shows running timer elsewhere without destructive stop
- **GIVEN** the user is authenticated
- **AND** the API reports a running timer
- **AND** that running timer either belongs to a different GitHub issue or has no stable GitHub issue linkage
- **WHEN** the injected control renders
- **THEN** it shows the authoritative running-timer context reported by the backend
- **AND** it does not infer current-issue ownership from matching display text alone
- **AND** it does not show an inline destructive `Stop Timer` action on the issue surface
- **AND** it guides the user to open the popup or workspace for global timer management

#### Scenario: Injected control preserves issue context on error
- **GIVEN** the injected control fails to start, stop, or refresh timer state
- **WHEN** the error is rendered
- **THEN** the control keeps the detected repository and issue context visible
- **AND** it shows concise inline error copy and a retry action

#### Scenario: Injected running state displays live elapsed time
- **GIVEN** the API reports a current running timer
- **WHEN** the injected control renders the running state
- **THEN** it shows a compact running indicator with live `HH:MM:SS` elapsed time
- **AND** it keeps the GitHub issue context visible

### Requirement: Extension Uses Existing Timer API Contracts
The extension SHALL consume existing timer endpoints and shared request/response shapes using the shared installation authorization and existing-project mapping policy. When stopping a timer, it SHALL first read the authoritative current timer and submit that entry's identity to the conditional stop contract.

#### Scenario: Start request matches shared GitHub timer contract
- **WHEN** the extension starts a timer from a GitHub issue
- **THEN** the request body contains only `githubRepo`, `issueNumber`, and an optional `githubProjectId` hint
- **AND** it matches the existing shared `startTimerFromGitHub` contract

#### Scenario: Extension conditionally stops the authoritative timer
- **GIVEN** the extension receives a timer-stop action
- **WHEN** it reads the authoritative current timer from the API
- **THEN** it sends that timer's identifier as `expectedTimerId` to `POST /time-entries/timer/stop`
- **AND** a changed timer is reported as a recoverable `409 Conflict`

#### Scenario: Current timer is reconciled from API
- **WHEN** the popup or injected control loads authenticated state
- **THEN** it queries the current timer endpoint before deriving idle or running UI
- **AND** it uses the backend response as authoritative state

#### Scenario: API failures remain retryable
- **GIVEN** a timer API call fails because of network, auth, conflict, or validation errors
- **WHEN** the extension renders the failure
- **THEN** it shows user-visible error feedback in the popup or injected control
- **AND** it preserves enough local page/session context for retry or sign-in recovery

## ADDED Requirements

### Requirement: Extension Tracking Does Not Require Personal GitHub Connection
The popup and injected control SHALL allow signed-in GiTiempo members to request installation-authorized tracking without gating actions on personal GitHub connection state. Browser sign-in to GitHub, GitHub sign-in to GiTiempo, and connecting a personal GitHub integration SHALL remain distinct. Both supported issue surfaces MUST resolve through the same backend authorization and canonical mapping rules.

#### Scenario: Signed-in assigned member starts without GitHub integration
- **GIVEN** a valid GiTiempo session, installation access, and project assignment, with no usable personal GitHub connection
- **WHEN** the member starts from the popup or injected control on a direct issue page or supported Projects issue pane
- **THEN** the control sends the start request without a personal connection prerequisite
- **AND** success displays the authoritative running timer

#### Scenario: GiTiempo session is still required
- **GIVEN** a GitHub browser session but no GiTiempo session
- **WHEN** either extension surface renders
- **THEN** it asks the user to sign in to GiTiempo before attempting tracking

### Requirement: Extension Shows Actionable Tracking Access Failures
Both popup and injected timer control SHALL interpret stable tracking error codes and show distinct assignment, installation, organization-policy, resource, mapping, and temporary-provider remedies. Errors MUST preserve local page context without exposing protected metadata. Failed starts MUST NOT be shown as running timers or clear an existing owned running timer.

#### Scenario: Project assignment is missing
- **GIVEN** the API returns `project_assignment_required`
- **WHEN** either extension surface displays the failure
- **THEN** it shows "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
- **AND** it offers no personal GitHub connection action as a remedy

#### Scenario: Installation requires administrator attention
- **GIVEN** the API reports missing/unverified, suspended, removed, or disconnected installation access, disallowed organization, or insufficient permissions
- **WHEN** either surface displays the failure
- **THEN** it directs the member to the workspace administrator with the safe returned reason
- **AND** it does not ask the member to connect GitHub

#### Scenario: Project mapping requires setup
- **GIVEN** the API reports a missing or ambiguous local project mapping
- **WHEN** either surface displays the failure
- **THEN** it directs the member to the workspace administrator or project manager to configure the mapping
- **AND** it does not create a project or assignment from the client

#### Scenario: Provider failure is retryable without session loss
- **GIVEN** a retryable GitHub provider failure or rate limit
- **WHEN** either surface displays the failure
- **THEN** it offers retry guidance while retaining the GiTiempo session
- **AND** it does not treat provider token renewal failure as a GiTiempo authentication failure

#### Scenario: Stop remains available after installation failure
- **GIVEN** an authoritative owned running timer and unavailable GitHub installation access
- **WHEN** the popup or matching-issue injected control renders
- **THEN** it retains the existing stop action and calls the ordinary GiTiempo stop endpoint
