# chrome-extension Specification

## Purpose
TBD - created by archiving change add-github-timer-chrome-extension. Update Purpose after archive.
## Requirements
### Requirement: Extension App Is Manifest V3
The system SHALL provide a browser extension app that builds as a Manifest V3 extension for each supported browser and runs independently from the user and admin SPAs.

#### Scenario: Extension package builds installable output per supported browser
- **WHEN** the extension build command runs
- **THEN** it produces one Manifest V3 bundle per supported browser, each with popup, content script, and a background entry of the form that browser supports
- **AND** each manifest includes host permissions and content-script matches required for supported GitHub issue-surface injection and GiTiempo API access
- **AND** a manifest carries no key that its own browser does not understand

#### Scenario: Firefox bundle declares a stable add-on identity
- **WHEN** the Firefox bundle is built
- **THEN** its manifest declares a gecko add-on id, a minimum supported browser version, and a data-collection declaration
- **AND** the add-on id comes from configuration rather than being fixed in the build, so environments installed side by side do not share one identity

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
The extension popup SHALL render the documented fixed-size GiTiempo popup states for authentication, detected issue context, running timer, and recoverable error conditions, and SHALL identify the signed-in user and offer entry into the GiTiempo web app home from every signed-in state.

#### Scenario: Popup prompts unauthenticated user
- **GIVEN** no valid extension session is available
- **WHEN** the user opens the extension popup
- **THEN** the popup shows the branded unauthenticated state
- **AND** it provides a primary sign-in action

#### Scenario: Popup header opens the web app home
- **GIVEN** the user is authenticated
- **WHEN** the user opens the extension popup in any signed-in state
- **THEN** the popup header shows an action that opens the User SPA home in a new browser tab
- **AND** the destination is the app home rather than the sign-in route
- **AND** the destination follows the configured User SPA origin for the deployed environment

#### Scenario: Popup header identifies the signed-in user
- **GIVEN** the user is authenticated
- **AND** the extension runtime snapshot carries a signed-in user
- **WHEN** the user opens the extension popup in any signed-in state
- **THEN** the popup header shows that user's initials avatar beside the home action
- **AND** the avatar remains visible while a timer is running and while timer state cannot be loaded
- **AND** the popup omits the avatar without hiding the home action when the snapshot carries no user

#### Scenario: Popup header stays bare before sign-in
- **GIVEN** the popup is still loading its state or no valid extension session is available
- **WHEN** the popup renders the branded header
- **THEN** it shows neither the home action nor the user avatar

#### Scenario: Popup shows detected issue with no active timer
- **GIVEN** the user is authenticated
- **AND** the active browser tab is a supported GitHub issue surface
- **AND** no current timer is running
- **WHEN** the user opens the extension popup
- **THEN** the popup shows the detected repository, issue number, and issue title
- **AND** it shows a full-width `Start Timer` action
- **AND** it offers the workspace through the header home action without repeating it as a body-level link

#### Scenario: Popup shows authenticated unsupported-page guidance
- **GIVEN** the user is authenticated
- **AND** the active browser tab is not a supported GitHub issue surface
- **WHEN** the user opens the extension popup
- **THEN** the popup keeps the branded shell visible
- **AND** it shows concise guidance that a supported GitHub issue is required to start a timer
- **AND** it does not show an available `Start Timer` action
- **AND** it shows a full-width action that opens the GiTiempo web app home

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
The extension SHALL authenticate users either through Firebase and the existing backend auth exchange or through the backend GitHub sign-in handoff, storing GiTiempo JWT session tokens in Chrome extension storage, and SHALL surface the signed-in user on its runtime snapshot for display.

#### Scenario: User signs in from popup
- **GIVEN** the user is unauthenticated in the extension
- **WHEN** the user completes either Google sign-in or email sign-in from the popup
- **THEN** the extension exchanges the Firebase identity with the backend auth API
- **AND** it stores the resulting GiTiempo access and refresh tokens in `chrome.storage`

#### Scenario: Google sign-in uses MV3-compatible extension auth flow
- **GIVEN** the user chooses `Sign in with Google` from the popup
- **WHEN** the extension starts the identity-provider flow
- **THEN** it uses an extension-owned MV3-compatible web auth flow with the redirect URI the running browser reports
- **AND** it reads the OAuth client id from extension configuration rather than from a manifest key, so the flow does not depend on a key only one browser family defines
- **AND** it does not assume SPA popup or redirect behavior that is unavailable to the extension runtime

#### Scenario: Email sign-in stays inside the popup boundary
- **GIVEN** the user chooses `Sign in with email` from the popup
- **WHEN** the user submits email/password credentials
- **THEN** the extension completes Firebase email sign-in inside the popup-owned auth boundary
- **AND** it exchanges the resulting Firebase identity with the backend auth API

#### Scenario: GitHub sign-in names the browser it runs in
- **GIVEN** the user chooses GitHub sign-in from the popup
- **WHEN** the extension requests the backend sign-in start endpoint
- **THEN** it sends which browser the build targets alongside its challenge
- **AND** it sends no redirect destination, so it cannot influence where the handoff code is delivered

#### Scenario: GitHub sign-in exchanges a backend handoff code
- **GIVEN** the user chooses GitHub sign-in from the popup
- **WHEN** the extension completes the backend GitHub sign-in flow and receives a one-time handoff code
- **THEN** it posts that code to the backend GitHub session endpoint
- **AND** it stores the returned GiTiempo access and refresh tokens in `chrome.storage`
- **AND** the exchange involves no Firebase identity

#### Scenario: GitHub sign-in reuses the same session shape
- **GIVEN** a member signs in to the extension with GitHub
- **WHEN** the extension stores the resulting session
- **THEN** the stored token pair is indistinguishable from one produced by Google or email sign-in
- **AND** subsequent authenticated requests, refreshes, and the runtime snapshot behave identically regardless of which action established the session

#### Scenario: Missing extension auth prerequisites fail explicitly
- **GIVEN** the extension auth flow is initialized without required identity permissions, redirect configuration, or Firebase origin support
- **WHEN** the user attempts to sign in
- **THEN** the extension fails with explicit recoverable auth error copy
- **AND** it does not silently fall back to an incomplete auth flow

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

#### Scenario: Runtime snapshot carries the signed-in user
- **GIVEN** a stored extension session
- **WHEN** the extension builds its runtime snapshot
- **THEN** the snapshot carries the signed-in user's email read from the stored session token
- **AND** it carries the display name when a running timer supplies one
- **AND** it carries no user when no session is stored
- **AND** it reads identity from the stored session without issuing an additional API request

### Requirement: Extension Detects GitHub Issue Context
The extension SHALL detect direct GitHub issue pages and supported GitHub Projects issue panes, derive one canonical issue context from the page, and use that context for local display and a reference timer start request.

#### Scenario: Supported GitHub issue URL is parsed
- **GIVEN** the active URL is `https://github.com/<owner>/<repo>/issues/<number>`
- **WHEN** the extension evaluates the page context
- **THEN** it derives `githubRepo` as `<owner>/<repo>` and `issueNumber` as the numeric issue number
- **AND** it derives the canonical URL `https://github.com/<owner>/<repo>/issues/<number>` without query or fragment components.

#### Scenario: Supported GitHub Projects issue pane is normalized
- **GIVEN** the active URL is a GitHub Projects pane URL with `pane=issue`
- **AND** the URL contains `issue=<owner>|<repo>|<number>`
- **WHEN** the extension evaluates the page context
- **THEN** it derives `githubRepo` as `<owner>/<repo>` and `issueNumber` as the numeric issue number
- **AND** it sends the direct canonical issue URL rather than the board URL.

#### Scenario: Malformed GitHub Projects issue pane URL is unsupported
- **GIVEN** the active URL is a GitHub Projects page
- **AND** the URL is missing `pane=issue`, missing the `issue` query value, or contains a non-numeric issue number
- **WHEN** the extension evaluates the page context
- **THEN** timer start actions that require issue metadata are unavailable
- **AND** the page is treated as unsupported issue context.

#### Scenario: Issue title is read from the issue surface
- **GIVEN** the active tab is a supported GitHub issue surface
- **WHEN** the extension prepares a timer start request
- **THEN** it obtains the issue title from the issue-specific DOM context
- **AND** it does not use the enclosing Project board title as the issue title
- **AND** it sends the bounded title with the repository, number, and canonical URL as untrusted reference metadata.

#### Scenario: Missing issue title is retryable
- **GIVEN** the active tab has otherwise valid issue identity
- **AND** the issue-specific title is not yet available after a GitHub rerender
- **WHEN** the extension prepares a timer start request
- **THEN** it waits for or retries context collection
- **AND** it does not send the board title as a substitute
- **AND** it shows recoverable context guidance if the title remains unavailable.

#### Scenario: Unsupported page disables issue actions
- **GIVEN** the active tab is not a supported GitHub issue surface
- **WHEN** the popup or content script evaluates page context
- **THEN** timer start actions that require issue metadata are unavailable
- **AND** the user receives concise guidance that a supported GitHub issue is required
- **AND** the popup keeps its branded shell and may keep a link to the full GiTiempo workspace.

### Requirement: Injected Issue Control Manages Timer State
The extension SHALL inject a page-local timer control into supported GitHub issue surfaces and keep its state aligned with the authenticated user's current timer and server-returned tracking capability.

#### Scenario: Injected control mounts at the start of direct issue main content
- **GIVEN** the active tab is a supported direct GitHub issue page
- **WHEN** the content script mounts the injected control
- **THEN** it inserts the control at the start of the page `main` content container
- **AND** the control remains page-local rather than rendering as a floating overlay.

#### Scenario: Injected control mounts above Projects issue pane sticky header
- **GIVEN** the active tab is a supported GitHub Projects issue pane
- **WHEN** the content script mounts the injected control
- **THEN** it inserts the control immediately above the element with id `issue-viewer-sticky-header`
- **AND** it uses tighter vertical spacing than the direct issue-page injected control
- **AND** the control remains page-local rather than rendering as a floating overlay.

#### Scenario: Injected control waits for Projects pane mount target
- **GIVEN** the active tab is a supported GitHub Projects issue pane
- **AND** the element with id `issue-viewer-sticky-header` is not yet present
- **WHEN** the content script evaluates the page context
- **THEN** it does not inject the control into a fallback location
- **AND** it mounts the control above `#issue-viewer-sticky-header` after that element becomes available.

#### Scenario: Injected control remounts after GitHub rerender
- **GIVEN** the injected control is mounted on a supported GitHub issue surface
- **AND** GitHub navigation or DOM rerender removes the injected host or replaces the mount target
- **WHEN** the content script observes the page change
- **THEN** it re-evaluates the current issue context
- **AND** it remounts the control in the correct surface-specific location when the page remains supported
- **AND** it unmounts the control when the page no longer has supported issue context.

#### Scenario: Injected idle control starts one resolved tracking flow
- **GIVEN** the user is authenticated
- **AND** the GitHub issue surface has no running timer for the current user
- **WHEN** the user clicks `Start Timer` in the injected control
- **THEN** the extension calls `POST /time-entries/timer/start-from-github-reference` with canonical issue context
- **AND** it does not choose an installation or reference fallback based on provider errors
- **AND** the control transitions to a running state only after the server accepts the start.

#### Scenario: Injected running control stops timer for the matching GitHub issue
- **GIVEN** the user is authenticated
- **AND** the API reports a running timer with stable GitHub issue linkage matching the current page
- **WHEN** the user clicks `Stop Timer` in the injected control
- **THEN** the extension calls `POST /time-entries/timer/stop`
- **AND** the control returns to an idle state after success.

#### Scenario: Injected control shows running timer elsewhere without destructive stop
- **GIVEN** the user is authenticated
- **AND** the API reports a running timer that belongs to a different GitHub issue or has no stable GitHub issue linkage
- **WHEN** the injected control renders
- **THEN** it shows the authoritative running-timer context reported by the backend
- **AND** it does not infer current-issue ownership from matching display text alone
- **AND** it does not show an inline destructive `Stop Timer` action on the issue surface
- **AND** it guides the user to open the popup or workspace for global timer management.

#### Scenario: Injected control preserves issue context on error
- **GIVEN** the injected control fails to start, stop, or refresh timer state
- **WHEN** the error is rendered
- **THEN** the control keeps the detected repository and issue context visible
- **AND** it shows concise inline error copy and a retry action.

#### Scenario: Injected running state displays live elapsed time
- **GIVEN** the API reports a current running timer
- **WHEN** the injected control renders the running state
- **THEN** it shows a compact running indicator with live `HH:MM:SS` elapsed time
- **AND** it keeps the GitHub issue context visible.

### Requirement: Extension Uses Existing Timer API Contracts
The extension SHALL use the shared reference-start contract for every supported issue surface. The backend SHALL resolve whether the issue is an existing managed mapping or an external reference; the extension SHALL not expose that distinction as separate user actions.

#### Scenario: Start request supplies canonical reference context
- **WHEN** the extension starts a timer from a supported GitHub issue
- **THEN** the request contains `githubRepo`, positive `issueNumber`, bounded issue title, and canonical direct issue URL
- **AND** it matches the shared reference-start contract
- **AND** it does not require an installation identifier, organization allow-list result, or personal GitHub connection.

#### Scenario: Extension conditionally stops the authoritative timer
- **GIVEN** the extension receives a timer-stop action
- **WHEN** it reads the authoritative current timer from the API
- **THEN** it sends that timer's identifier as `expectedTimerId` to `POST /time-entries/timer/stop`
- **AND** a changed timer is reported as a recoverable `409 Conflict`.

#### Scenario: Current timer and capabilities are reconciled from API
- **WHEN** the popup or injected control loads authenticated state
- **THEN** it queries the current timer and tracking capability snapshot before deriving idle or running UI
- **AND** it uses server-returned capability and access scope as authoritative state.

#### Scenario: API failures remain retryable
- **GIVEN** a timer API call fails because of network, auth, conflict, validation, or denied capability
- **WHEN** the extension renders the failure
- **THEN** it shows user-visible error feedback in the popup or injected control
- **AND** it preserves enough local page and session context for retry or sign-in recovery
- **AND** it does not retry another tracking path automatically.

### Requirement: Popup Header Opens An Account Menu
The popup header's user avatar SHALL open an account menu in every signed-in state. The menu MUST identify the signed-in member, show a Workspace selector above Open profile, and offer opening the profile and signing out. It MUST be dismissible without changing underlying state merely by dismissal. It MUST NOT appear before sign-in.

#### Scenario: Avatar opens the account menu
- **GIVEN** the user is authenticated and the runtime snapshot carries a signed-in user
- **WHEN** the user activates the header avatar in any signed-in state
- **THEN** an account menu opens over the state beneath it
- **AND** the avatar reports itself as an expanded control to assistive technology
- **AND** the menu names the signed-in member, so the session being acted on is identified before it can be ended

#### Scenario: Menu offers workspace selection and profile and sign-out actions
- **GIVEN** the account menu is open
- **WHEN** the user reads its controls
- **THEN** the Workspace selector appears above Open profile, followed by Sign out
- **AND** the header's existing home action remains available outside the menu

#### Scenario: Profile action opens the user web app profile page
- **GIVEN** the account menu is open
- **WHEN** the user chooses the profile action
- **THEN** the member's profile page in the user web app opens in a new browser tab
- **AND** the destination follows the configured user web app origin for the deployed environment

#### Scenario: Menu is dismissible without side effects
- **GIVEN** the account menu is open
- **WHEN** the user dismisses the menu with Escape or an outside interaction
- **THEN** the menu closes without changing the session or a running timer
- **AND** activating Open profile or Sign out closes the menu while performing its specified action

#### Scenario: Browser host intercepts Escape after native options dismissal
- **GIVEN** Escape has closed the native Workspace options
- **WHEN** the browser host intercepts the next Escape before the popup document can handle it
- **THEN** closing the entire extension popup is permitted
- **AND** dismissal does not change the session or a running timer
- **AND** when Escape reaches the document with the account menu open, the extension cancels default popup closure and dismisses only the menu

#### Scenario: An open menu survives a timer tick
- **GIVEN** a timer is running, so the popup re-renders on its own each second
- **WHEN** the account menu is open across one of those re-renders
- **THEN** it stays open without being duplicated or detached
- **AND** workspace selection and keyboard focus are preserved

#### Scenario: No account menu before sign-in
- **GIVEN** the popup is still loading its state, or no valid extension session is available
- **WHEN** the popup renders the branded header
- **THEN** no account menu is reachable
- **AND** the header stays as it is specified for that state

### Requirement: Extension Can End Its Session

The extension SHALL end a session on request by invalidating in-flight session refreshes, clearing its stored GiTiempo session and extension-local Firebase authentication state, and attempting bounded best-effort backend revocation using the captured GiTiempo credentials. Local cleanup MUST NOT depend on a backend response. A successfully completed logout MUST leave every extension surface unauthenticated without ending sessions in other applications or identity-provider websites.

#### Scenario: Signing out clears locally and attempts revocation

- **GIVEN** a stored extension session
- **WHEN** the user signs out from the account menu
- **THEN** the extension captures the credentials required to revoke that session and invalidates pending session refresh results
- **AND** it clears the stored GiTiempo session and initiates extension-local Firebase sign-out without waiting for backend revocation
- **AND** it attempts bounded best-effort revocation of the captured backend session

#### Scenario: A failed revoke still ends the local session

- **GIVEN** a stored extension session
- **AND** the backend is unreachable or refuses the revoke
- **WHEN** the user signs out
- **THEN** the stored GiTiempo session and extension-local Firebase state are still cleared when local storage is available
- **AND** the user is not left signed in against their explicit request

#### Scenario: A revoke that never answers does not hold the session open

- **GIVEN** a stored extension session
- **AND** the revoke request stalls rather than failing
- **WHEN** the user signs out
- **THEN** both local authentication cleanup operations proceed without waiting for that request to settle
- **AND** the revoke attempt is bounded so logout completion does not wait indefinitely for the network

#### Scenario: A refresh in flight cannot restore an ended session

- **GIVEN** a token refresh is in flight when the user signs out
- **WHEN** that refresh completes afterwards with a rotated token pair
- **THEN** the pair is not stored, and the session stays ended
- **AND** the rotated pair is revoked, since the sign-out could only revoke the pair it was given

#### Scenario: Every surface reflects the ended session

- **GIVEN** the user has successfully signed out
- **WHEN** the popup and any injected issue control next render
- **THEN** the popup shows its unauthenticated state
- **AND** the injected control no longer offers authenticated timer actions
- **AND** no further request is made with the cleared session

#### Scenario: Signing out does not stop a running timer

- **GIVEN** a timer is running for the signed-in member
- **WHEN** the user signs out
- **THEN** the timer is left running, because it belongs to the workspace rather than to the client that started it
- **AND** the menu warns, before the action is taken, that the timer will keep running, so the outcome is not a surprise

#### Scenario: Firebase credentials do not survive successful logout

- **GIVEN** a Google or email/password sign-in persisted Firebase authentication state in the extension
- **WHEN** logout succeeds and the extension popup or background runtime is reopened
- **THEN** neither a GiTiempo token pair nor an authenticated Firebase user is restored from extension-local persistence
- **AND** the user's web-app and Google/GitHub website sessions are unaffected

#### Scenario: GitHub-only or repeated cleanup is safe

- **GIVEN** the extension has no Firebase session or its GiTiempo token pair has already been removed
- **WHEN** local logout cleanup is requested
- **THEN** missing session state is treated as already cleared
- **AND** any remaining provider authentication state is still cleaned up

#### Scenario: One local cleanup operation fails

- **GIVEN** Firebase persistence cleanup fails while GiTiempo storage remains available
- **WHEN** the user signs out
- **THEN** the extension still clears the GiTiempo session, invalidates pending refresh results, and attempts backend revocation
- **AND** it reports the incomplete provider cleanup through a recoverable error rather than claiming all authentication state was removed
- **AND** the user can retry provider cleanup without needing to establish another GiTiempo session

#### Scenario: Incomplete cleanup remains recoverable after reopening

- **GIVEN** provider cleanup failed after the GiTiempo session was removed
- **WHEN** the user reopens the popup, including after the background runtime restarts
- **THEN** the unauthenticated popup presents the incomplete-cleanup error with a `Retry sign-out` action
- **AND** the action retries provider cleanup without opening an authenticated account menu or requesting a new login
- **AND** the pending cleanup indicator contains no credentials and is removed when cleanup succeeds

### Requirement: Popup Offers GitHub Sign-In When Enabled For The Build
The extension popup SHALL offer a GitHub sign-in action in its unauthenticated state when GitHub sign-in is enabled for the build, SHALL omit that action otherwise, and SHALL follow the approved popup authorization design for how the available sign-in actions are presented. Its recoverable sign-in copy SHALL name the no-member and ambiguous-account causes it can distinguish.

#### Scenario: GitHub action appears alongside the existing actions
- **GIVEN** GitHub sign-in is enabled for the extension build
- **AND** no valid extension session is available
- **WHEN** the user opens the extension popup
- **THEN** the unauthenticated state offers a GitHub sign-in action together with the Google and email actions
- **AND** the arrangement follows the approved popup authorization design

#### Scenario: GitHub action is hidden when not enabled
- **GIVEN** GitHub sign-in is not enabled for the extension build
- **WHEN** the user opens the extension popup unauthenticated
- **THEN** no GitHub sign-in action is shown
- **AND** the Google and email actions are unaffected

#### Scenario: Returned error indicator becomes recoverable copy
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the flow returns to the extension carrying an error indicator instead of a handoff code
- **THEN** the popup shows recoverable sign-in error copy naming the failure it can distinguish
- **AND** no session is stored
- **AND** the user can retry sign-in from the same state

#### Scenario: No-member indicator names the missing work address
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the flow returns the no-member error indicator
- **THEN** the popup explains that no GiTiempo account matches any verified email on the GitHub account
- **AND** it names `https://github.com/settings/emails` as where to add and verify a work address
- **AND** no session is stored

#### Scenario: Ambiguous-account indicator directs to email sign-in
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the flow returns the ambiguous-account error indicator
- **THEN** the popup explains that the GitHub account matches more than one GiTiempo account
- **AND** it directs the user to sign in with their email address instead

#### Scenario: Abandoned authorization window is not an error state
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the authorization window closes without reaching the extension redirect destination
- **THEN** the popup returns to its unauthenticated state reporting a cancelled attempt
- **AND** it does not present the attempt as a backend or configuration failure

### Requirement: Extension Tracking Does Not Require Personal GitHub Connection
The popup and injected control SHALL allow signed-in GiTiempo members to request reference tracking and server-routed installation-authorized tracking without gating actions on personal GitHub connection state. Browser sign-in to GitHub, GitHub sign-in to GiTiempo, and connecting a personal GitHub integration SHALL remain distinct. Both supported issue surfaces MUST resolve through the same backend authorization and canonical mapping rules.

#### Scenario: Signed-in assigned member starts without GitHub integration
- **GIVEN** a valid GiTiempo session, installation access, and project assignment, with no usable personal GitHub connection
- **WHEN** the member starts from the popup or injected control on a direct issue page or supported Projects issue pane
- **THEN** the control sends the start request without a personal connection prerequisite
- **AND** success displays the authoritative running timer

#### Scenario: GiTiempo session is still required
- **GIVEN** a GitHub browser session but no GiTiempo session
- **WHEN** either extension surface renders
- **THEN** it asks the user to sign in to GiTiempo before attempting tracking

#### Scenario: New customer repository requires no GitHub setup
- **GIVEN** a valid GiTiempo session and complete issue context for an unmapped repository without organization approval, App installation, or personal GitHub linking
- **WHEN** the member uses either supported extension start surface
- **THEN** it submits the reference-start request without any GitHub setup prerequisite

### Requirement: Extension Shows Actionable Tracking Access Failures
For managed routing, both popup and injected timer control SHALL interpret stable tracking error codes and show distinct assignment, installation, organization-policy, resource, mapping, and temporary-provider remedies. Errors MUST preserve local page context without exposing protected metadata. Failed starts MUST NOT be shown as running timers or clear an existing owned running timer.

#### Scenario: Project assignment is missing
- **GIVEN** the API returns `project_assignment_required`
- **WHEN** either extension surface displays the failure
- **THEN** it shows "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time."
- **AND** it offers no personal GitHub connection action as a remedy

#### Scenario: Installation requires administrator attention
- **GIVEN** managed routing reports missing/unverified, suspended, removed, or disconnected installation access, disallowed organization, or insufficient permissions
- **WHEN** either surface displays the failure
- **THEN** it directs the member to the workspace administrator with the safe returned reason
- **AND** it does not ask the member to connect GitHub

#### Scenario: Project mapping requires setup
- **GIVEN** managed routing reports a missing mapping, or any route reports an ambiguous mapping
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

#### Scenario: Unmapped reference start does not request deliberate setup
- **GIVEN** complete issue context resolves to no existing mapping through the reference route
- **WHEN** the member starts tracking
- **THEN** the extension permits server materialization without prompting for project assignment, App installation, organization approval, or personal GitHub linking

#### Scenario: Invalid context remains an actionable local failure
- **GIVEN** issue context is incomplete, stale, or invalid
- **WHEN** either extension surface renders or receives a validation rejection
- **THEN** it explains that the issue context must be refreshed and offers retry without pretending a timer started


### Requirement: Extension Uses Minimum Browser Permissions

The Chrome release package MUST request only `identity`, `storage`, and the host access needed for the configured GiTiempo API and supported GitHub integration. It MUST NOT request broad `tabs` access, wildcard access to unrelated hosts, or permissions reserved for future features. Supported browser behavior MUST be verified after permission changes.

#### Scenario: Chrome release manifest is inspected

- **GIVEN** the release package has been built with its intended environment
- **WHEN** its manifest permissions are reviewed
- **THEN** API permissions are limited to `identity` and `storage`
- **AND** host permissions are limited to the configured API origin and GitHub
- **AND** content-script registration is restricted to GitHub, including navigation entry pages needed for same-document transitions to supported issues, and excludes pull-request pages

#### Scenario: Supported tab behavior works with scoped access

- **GIVEN** the extension is installed with its minimum permissions
- **WHEN** the user opens supported GitHub issues and organization-project issue panes, with or without a `/views/{view}` path segment, and operates the timer
- **THEN** popup context resolution, injected controls, and updates across matching tabs continue to work
- **AND** opening the web app and profile continues to work
- **AND** Chrome verification records identify any necessary permission difference; Firefox runtime verification is explicitly deferred for this release-preparation pass, not reported as passed

#### Scenario: Pull requests remain outside extension scope

- **WHEN** the user opens a GitHub pull request
- **THEN** the extension does not inject timer controls or treat that page as a supported timer context
- **AND** content-script matches, background tab broadcasts, and release declarations exclude pull-request pages

### Requirement: Chrome Web Store Privacy Declarations Match the Release

The release documentation MUST maintain a reviewable inventory mapping extension data handling, browser permissions, and executable-code sources to the Chrome Web Store privacy fields for the exact candidate package. It MUST distinguish draft declarations, publisher-confirmed practices, and values actually verified in the Dashboard. Publication readiness MUST require consistency between the package, public policy, and Dashboard declarations.

#### Scenario: Data inventory is prepared

- **GIVEN** a candidate package and its data flows have been inspected
- **WHEN** privacy declarations are drafted
- **THEN** the inventory covers account/profile data, credentials and session tokens, GitHub page context/content, and timer records
- **AND** it distinguishes local processing from transmission to GiTiempo, Firebase/Google, and GitHub
- **AND** locally handled URL/title data is not omitted solely because it is not transmitted
- **AND** each category selection is justified against current Dashboard definitions without claiming full browsing-history or passive activity monitoring
- **AND** landing-only analytics is distinguished from the extension's handling of data

#### Scenario: Permissions and remote code are declared

- **GIVEN** the final manifest and bundled code are available
- **WHEN** their declarations are prepared
- **THEN** each requested permission and host has a justification tied to GitHub-linked time tracking
- **AND** a declaration of no remote executable code is supported by inspection of the built package
- **AND** API data requests and provider authentication pages are distinguished from remote code executed inside the extension

#### Scenario: Publisher facts or Dashboard access remain unverified

- **GIVEN** a policy fact, publisher certification, or Dashboard value has not been confirmed
- **WHEN** release readiness is assessed
- **THEN** that item remains an explicit unresolved publication prerequisite
- **AND** the checklist does not invent business facts or claim Store submission/readiness on the basis of a local code audit alone
- **AND** the review record contains no passwords, session tokens, private keys, or reviewer credentials

#### Scenario: Candidate is ready for submission

- **GIVEN** the candidate package and policy have been verified and publisher facts confirmed
- **WHEN** the Dashboard declarations are checked before submission
- **THEN** the record identifies package version and hash, policy URL, review date, category/permission decisions, and certification status
- **AND** the public policy and recorded Dashboard declarations agree with that candidate's behavior

#### Scenario: Publisher owns the Dashboard review

- **GIVEN** the publisher explicitly takes ownership of actual Store field verification
- **WHEN** the agent completes its engineering handoff
- **THEN** Dashboard review is recorded as an external publisher-owned follow-up, not an agent completion blocker
- **AND** the agent does not request Dashboard access or inspect, change or certify those fields
- **AND** engineering completion is distinguished from final Store submission readiness, which still requires the publisher's review

### Requirement: Extension Presents Reference Tracking Without GitHub Setup Gates
The popup and injected control SHALL allow an authenticated GiTiempo workspace member to request reference tracking from supported issue context without requiring a personal GitHub connection, GitHub App installation, or organization allow-list membership.

#### Scenario: Popup shows current workspace destination
- **GIVEN** the user is authenticated and a supported issue context is available
- **WHEN** the popup renders an idle tracking action
- **THEN** it identifies the current GiTiempo workspace that will receive the time entry
- **AND** it does not show a `Connect GitHub` prerequisite for reference tracking.

#### Scenario: Capability denial disables start without revealing protected data
- **GIVEN** the server capability snapshot says the member cannot start tracking in the current workspace
- **WHEN** either extension surface renders the issue control
- **THEN** it disables or replaces the Start action with the safe server-provided reason
- **AND** it does not reveal hidden project, task, member, or colleague-time data.

#### Scenario: Managed project denial is not bypassed in the client
- **GIVEN** the reference-start response denies tracking because a managed project preserves its existing restriction
- **WHEN** either extension surface renders the failure
- **THEN** it presents the returned access guidance
- **AND** it does not create a client-side retry using another endpoint, project identifier, or tracking mode.

### Requirement: Extension Shows Available Workspace Memberships
The extension SHALL obtain available workspaces from the authenticated membership API and identify the current workspace from its accepted session. The selector SHALL be labeled and keyboard accessible, with accessible loading, progress and error feedback.

#### Scenario: Multiple memberships are selectable
- **GIVEN** the member has multiple active workspace memberships
- **WHEN** membership loading succeeds
- **THEN** the selector shows the current workspace and allows selection of the returned memberships regardless of role
- **AND** choosing the already selected workspace makes no switch request

#### Scenario: One membership remains visible
- **GIVEN** the member has exactly one active membership
- **WHEN** membership loading succeeds
- **THEN** the selector displays that workspace and is disabled

#### Scenario: Membership loading or failure does not select a fallback
- **GIVEN** the account menu is open
- **WHEN** memberships are loading or fail to load
- **THEN** the selector is unavailable and shows loading or retryable error feedback respectively
- **AND** no fallback workspace is selected and profile/sign-out remain available

### Requirement: Extension Switches Its Own Workspace Session Safely
The extension SHALL switch via the existing authenticated workspace-switch contract and persist the returned access/refresh pair as one accepted session before publishing success. The extension SHALL keep its selection independent of web-app sessions and SHALL prevent stale authentication results from overwriting a newer session or reversing sign-out.

#### Scenario: Successful switch persists across extension lifecycle
- **GIVEN** the current workspace is A and the member chooses B
- **WHEN** switching succeeds
- **THEN** the extension stores the target token pair and displays B
- **AND** refresh, popup reopening and background-worker restart retain B while the session remains valid
- **AND** user/admin web-app sessions remain unchanged

#### Scenario: Concurrent rotations use the current session
- **GIVEN** refresh, a repeated selection or another switch overlaps a workspace switch
- **WHEN** the extension handles those requests
- **THEN** refresh-token rotations are serialized or coalesced using the latest accepted token pair
- **AND** stale results cannot overwrite the accepted workspace or sign the member out due solely to an avoidable client rotation race

#### Scenario: Sign-out or new login supersedes a pending switch
- **GIVEN** a switch is pending
- **WHEN** the member signs out or establishes a newer login
- **THEN** the switch result cannot restore the old session or replace the newer login
- **AND** a successful rotated pair arriving after sign-out is revoked with bounded best-effort cleanup without delaying local sign-out or affecting the newer session

#### Scenario: Removed target membership is rejected
- **GIVEN** B appeared in the membership list but access to it was revoked
- **WHEN** switching to B returns a membership denial
- **THEN** the extension keeps the valid current session, reloads memberships and shows actionable feedback
- **AND** it does not claim B is selected

#### Scenario: Failed or uncertain switch does not publish success
- **GIVEN** a switch encounters network failure or invalid authentication
- **WHEN** the outcome cannot establish a valid target session
- **THEN** the extension reports failure and reconciles authentication before enabling dependent actions
- **AND** it requires sign-in if recovery cannot establish a valid session
- **AND** it neither blindly replays an uncertain token rotation nor silently chooses another workspace

### Requirement: Workspace Switching Reconciles Tracking State
The extension SHALL invalidate previous workspace snapshots and tracking preflight on a switch, refresh authoritative timer and target-workspace capability state, and update the popup and injected controls. Switching SHALL NOT stop, migrate or relabel an existing entry. A running timer SHALL remain global to the user and stoppable across workspace contexts.

#### Scenario: Next timer starts in the selected workspace
- **GIVEN** there is no running timer and a switch to B succeeds
- **WHEN** fresh capabilities allow tracking and the member starts from the popup or a supported injected issue control
- **THEN** the destination shown and the newly created entry belong to B

#### Scenario: A running timer survives workspace switching
- **GIVEN** the member has a running timer in A
- **WHEN** the member switches to B
- **THEN** the same timer remains visible with its original workspace and elapsed time
- **AND** a second timer cannot start while it is active
- **AND** conditional Stop can stop that timer from B
- **AND** a subsequent permitted Start creates an entry in B

#### Scenario: Tracking mutation overlaps a switch
- **GIVEN** a timer mutation was accepted before a switch began
- **WHEN** the switch is requested
- **THEN** that mutation settles in its original context before the switch proceeds
- **AND** further timer mutations remain unavailable until target state is reconciled

#### Scenario: Old controls cannot act under a different workspace
- **GIVEN** a popup or injected control holds a preflight or action for A
- **WHEN** a switch to B begins or finishes
- **THEN** stale snapshots and actions are rejected or invalidated before dispatch
- **AND** open extension surfaces receive refreshed state before actions become available
- **AND** denied capability in B is displayed without reusing A's permission
