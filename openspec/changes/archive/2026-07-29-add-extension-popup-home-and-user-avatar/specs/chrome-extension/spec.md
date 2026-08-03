## MODIFIED Requirements

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
The extension SHALL authenticate users through Firebase and the existing backend auth exchange, storing GiTiempo JWT session tokens in Chrome extension storage, and SHALL surface the signed-in user on its runtime snapshot for display.

#### Scenario: User signs in from popup
- **GIVEN** the user is unauthenticated in the extension
- **WHEN** the user completes either Google sign-in or email sign-in from the popup
- **THEN** the extension exchanges the Firebase identity with the backend auth API
- **AND** it stores the resulting GiTiempo access and refresh tokens in `chrome.storage`

#### Scenario: Google sign-in uses MV3-compatible extension auth flow
- **GIVEN** the user chooses `Sign in with Google` from the popup
- **WHEN** the extension starts the identity-provider flow
- **THEN** it uses an extension-owned MV3-compatible web auth flow with the extension redirect URI
- **AND** it does not assume SPA popup or redirect behavior that is unavailable to the extension runtime

#### Scenario: Email sign-in stays inside the popup boundary
- **GIVEN** the user chooses `Sign in with email` from the popup
- **WHEN** the user submits email/password credentials
- **THEN** the extension completes Firebase email sign-in inside the popup-owned auth boundary
- **AND** it exchanges the resulting Firebase identity with the backend auth API

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
