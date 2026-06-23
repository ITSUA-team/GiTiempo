## MODIFIED Requirements

### Requirement: Extension App Is Manifest V3
The system SHALL provide a Chrome extension app that builds as a Manifest V3 browser extension and runs independently from the user and admin SPAs.

#### Scenario: Extension package builds installable output
- **WHEN** the extension build command runs
- **THEN** it produces a Manifest V3 extension bundle with popup, content script, and background or service-worker entries
- **AND** the manifest includes host permissions and content-script matches required for supported GitHub issue-surface injection and GiTiempo API access

#### Scenario: Missing required extension environment fails fast
- **GIVEN** the extension build or startup environment is missing any required `VITE_EXTENSION_*` value
- **WHEN** the extension configuration is initialized outside relaxed local test or dev mode
- **THEN** initialization fails with an explicit configuration error
- **AND** the extension does not silently fall back to incomplete production auth or API settings

#### Scenario: Extension remains PrimeVue-free
- **WHEN** extension UI bundles are built
- **THEN** they use Tailwind-backed project tokens for styling
- **AND** they do not load PrimeVue or SPA router/store bootstrap code

### Requirement: Popup Supports Auth And Timer States
The extension popup SHALL render the documented fixed-size GiTiempo popup states for authentication, detected issue context, running timer, and recoverable error conditions.

#### Scenario: Popup prompts unauthenticated user
- **GIVEN** no valid extension session is available
- **WHEN** the user opens the extension popup
- **THEN** the popup shows the branded unauthenticated state
- **AND** it provides a primary sign-in action

#### Scenario: Popup shows detected issue with no active timer
- **GIVEN** the user is authenticated
- **AND** the active browser tab is a supported GitHub issue surface
- **AND** no current timer is running
- **WHEN** the user opens the extension popup
- **THEN** the popup shows the detected repository, issue number, and issue title
- **AND** it shows a full-width `Start Timer` action
- **AND** it shows a link to open the full GiTiempo workspace

#### Scenario: Popup shows authenticated unsupported-page guidance
- **GIVEN** the user is authenticated
- **AND** the active browser tab is not a supported GitHub issue surface
- **WHEN** the user opens the extension popup
- **THEN** the popup keeps the branded shell visible
- **AND** it shows concise guidance that a supported GitHub issue is required to start a timer
- **AND** it does not show an available `Start Timer` action
- **AND** it shows a link to open the full GiTiempo workspace

#### Scenario: Popup shows running timer
- **GIVEN** the user is authenticated
- **AND** the API reports a currently running timer
- **WHEN** the user opens the extension popup
- **THEN** the popup shows a live elapsed time indicator
- **AND** it shows task and project or repository context
- **AND** it shows a full-width destructive `Stop Timer` action

#### Scenario: Popup shows retryable error
- **GIVEN** the popup cannot load session, tab, or timer state
- **WHEN** the user opens the extension popup
- **THEN** the popup shows concise inline error or disconnected copy
- **AND** it provides a retry action without hiding the branded popup shell

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
- **THEN** it includes the detected issue title as `issueTitle`
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
- **THEN** the extension calls `POST /time-entries/timer/start-from-github` with `githubRepo`, `issueNumber`, and `issueTitle`
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
