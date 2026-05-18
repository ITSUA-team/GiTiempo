## ADDED Requirements

### Requirement: Extension App Is Manifest V3
The system SHALL provide a Chrome extension app that builds as a Manifest V3 browser extension and runs independently from the user and admin SPAs.

#### Scenario: Extension package builds installable output
- **WHEN** the extension build command runs
- **THEN** it produces a Manifest V3 extension bundle with popup, content script, and background or service-worker entries
- **AND** the manifest includes host permissions required for GitHub issue-page injection and GiTiempo API access

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
- **AND** the active browser tab is a supported GitHub issue page
- **AND** no current timer is running
- **WHEN** the user opens the extension popup
- **THEN** the popup shows the detected repository, issue number, and issue title
- **AND** it shows a full-width `Start Timer` action
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

### Requirement: Extension Authenticates With Workspace Session
The extension SHALL authenticate users through Firebase and the existing backend auth exchange, storing GiTiempo JWT session tokens in Chrome extension storage.

#### Scenario: User signs in from popup
- **GIVEN** the user is unauthenticated in the extension
- **WHEN** the user completes either Google sign-in or email sign-in from the popup
- **THEN** the extension exchanges the Firebase identity with the backend auth API
- **AND** it stores the resulting GiTiempo access and refresh tokens in `chrome.storage`

#### Scenario: Expired access token refreshes once
- **GIVEN** an extension session has an access token and refresh token in `chrome.storage`
- **AND** an authenticated GiTiempo API request returns `401`
- **WHEN** the extension handles the failed request
- **THEN** it attempts one `/auth/refresh` exchange with the stored refresh token
- **AND** a successful refresh stores the new token pair and retries the original request once
- **AND** a failed refresh clears the extension session and returns the user to the unauthenticated popup state

#### Scenario: API request includes access token
- **GIVEN** a GiTiempo access token is available in extension storage
- **WHEN** the extension calls a GiTiempo API endpoint
- **THEN** it sends the token in the `Authorization` header

#### Scenario: Missing auth redirects action to popup sign-in
- **GIVEN** the injected issue-page control is rendered without a valid extension session
- **WHEN** the user views the control
- **THEN** the primary action opens the extension or otherwise guides the user to sign in
- **AND** it does not attempt to start a timer without a token

### Requirement: Extension Detects GitHub Issue Context
The extension SHALL detect supported GitHub issue pages and derive the local timer request context from the current page.

#### Scenario: Supported GitHub issue URL is parsed
- **GIVEN** the active URL is `https://github.com/<owner>/<repo>/issues/<number>`
- **WHEN** the extension evaluates the page context
- **THEN** it derives `githubRepo` as `<owner>/<repo>`
- **AND** it derives `issueNumber` as the numeric issue number

#### Scenario: Issue title is detected from page content
- **GIVEN** the active tab is a supported GitHub issue page
- **WHEN** the extension prepares a timer start request
- **THEN** it includes the detected issue title as `issueTitle`
- **AND** it uses a safe fallback or retryable error when the title cannot be determined

#### Scenario: Unsupported page disables issue actions
- **GIVEN** the active tab is not a supported GitHub issue URL
- **WHEN** the popup or content script evaluates page context
- **THEN** timer start actions that require issue metadata are unavailable
- **AND** the user receives concise guidance that a GitHub issue page is required
- **AND** the popup keeps its branded shell and may keep a link to the full GiTiempo workspace

### Requirement: Injected Issue Control Manages Timer State
The extension SHALL inject a page-local timer control into supported GitHub issue pages and keep its state aligned with the authenticated user's current timer.

#### Scenario: Injected idle control starts timer
- **GIVEN** the user is authenticated
- **AND** the GitHub issue page has no running timer for the current user
- **WHEN** the user clicks `Start Timer` in the injected control
- **THEN** the extension calls `POST /time-entries/timer/start-from-github` with `githubRepo`, `issueNumber`, and `issueTitle`
- **AND** the control transitions to a running state after success

#### Scenario: Injected running control stops timer
- **GIVEN** the user is authenticated
- **AND** the API reports a running timer
- **WHEN** the user clicks `Stop Timer` in the injected control
- **THEN** the extension calls `POST /time-entries/timer/stop`
- **AND** the control returns to an idle state after success

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
The extension SHALL consume existing timer endpoints and shared request/response shapes without requiring new backend behavior.

#### Scenario: Start request matches shared GitHub timer contract
- **WHEN** the extension starts a timer from a GitHub issue
- **THEN** the request body contains only `githubRepo`, `issueNumber`, and `issueTitle`
- **AND** it matches the existing shared `startTimerFromGitHub` contract

#### Scenario: Current timer is reconciled from API
- **WHEN** the popup or injected control loads authenticated state
- **THEN** it queries the current timer endpoint before deriving idle or running UI
- **AND** it uses the backend response as authoritative state

#### Scenario: API failures remain retryable
- **GIVEN** a timer API call fails because of network, auth, conflict, or validation errors
- **WHEN** the extension renders the failure
- **THEN** it shows user-visible error feedback in the popup or injected control
- **AND** it preserves enough local page/session context for retry or sign-in recovery
