## MODIFIED Requirements

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
