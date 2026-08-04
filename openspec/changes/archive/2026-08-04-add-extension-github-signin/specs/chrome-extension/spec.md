## MODIFIED Requirements

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
- **THEN** it uses an extension-owned MV3-compatible web auth flow with the extension redirect URI
- **AND** it does not assume SPA popup or redirect behavior that is unavailable to the extension runtime

#### Scenario: Email sign-in stays inside the popup boundary
- **GIVEN** the user chooses `Sign in with email` from the popup
- **WHEN** the user submits email/password credentials
- **THEN** the extension completes Firebase email sign-in inside the popup-owned auth boundary
- **AND** it exchanges the resulting Firebase identity with the backend auth API

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

## ADDED Requirements

### Requirement: Popup Offers GitHub Sign-In When Enabled For The Build
The extension popup SHALL offer a GitHub sign-in action in its unauthenticated state when GitHub sign-in is enabled for the build, SHALL omit that action otherwise, and SHALL follow the approved popup authorization design for how the available sign-in actions are presented.

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

#### Scenario: Abandoned authorization window is not an error state
- **GIVEN** the user started GitHub sign-in from the popup
- **WHEN** the authorization window closes without reaching the extension redirect destination
- **THEN** the popup returns to its unauthenticated state reporting a cancelled attempt
- **AND** it does not present the attempt as a backend or configuration failure

### Requirement: Extension GitHub Sign-In Returns Through A Configured Extension Destination
The backend GitHub sign-in flow SHALL accept an extension login target, and for that target SHALL return the browser to a redirect destination read from backend configuration on every outcome. It MUST NOT take that destination from the request, and MUST fail closed when the destination is not configured.

#### Scenario: Extension target starts the flow
- **GIVEN** GitHub sign-in and an extension redirect destination are configured for the backend
- **WHEN** the browser requests the start endpoint for the extension target
- **THEN** the backend redirects to GitHub authorization exactly as it does for the web targets
- **AND** the signed state records that the extension started the flow

#### Scenario: Success returns the handoff code to the extension
- **GIVEN** an extension-initiated flow returns from GitHub with a verifiable state and an authorization code
- **WHEN** the backend resolves the primary verified email
- **THEN** it redirects the browser to the configured extension destination carrying a one-time handoff code
- **AND** it does not redirect to a web app route

#### Scenario: Failure returns to the extension rather than a web login page
- **GIVEN** an extension-initiated flow
- **WHEN** the user denies authorization, the state cannot be verified, no verified primary email exists, or the code exchange fails
- **THEN** the backend redirects the browser to the configured extension destination carrying an error indicator
- **AND** it does not redirect to a web app login page, so the extension's authorization window always reaches a destination it can observe

#### Scenario: Redirect destination is never taken from the request
- **GIVEN** a request to the start endpoint supplies its own candidate redirect destination
- **WHEN** the backend builds the extension flow
- **THEN** it uses only the configured destination
- **AND** a handoff code is never delivered to a destination named by the caller

#### Scenario: Unrecognized login target falls back to the user app
- **GIVEN** a request to the start endpoint names a login target the backend does not recognize
- **WHEN** the backend resolves which app to return to
- **THEN** it treats the flow as a user-app flow
- **AND** it does not deliver the outcome to the extension destination

#### Scenario: Unconfigured extension destination fails closed
- **GIVEN** the backend has no extension redirect destination configured
- **WHEN** an extension-target flow is attempted
- **THEN** the backend reports the flow as unavailable
- **AND** no partial or defaulted destination is used

### Requirement: Extension Session Establishment Is Bound To Its Initiator
For the extension login target, the backend SHALL accept a handoff code only for a transaction it can attribute to the client that started it, by proof of possession at the session exchange rather than by the cookie the web targets use, since the extension's authorization window does not carry that cookie to the callback. It MUST refuse to start an extension transaction that could not be bound this way.

#### Scenario: A transaction started elsewhere cannot establish an extension session
- **GIVEN** a GitHub authorization completed for a transaction that a different client started
- **WHEN** that transaction's outcome is presented in order to establish an extension session
- **THEN** the session exchange refuses to establish the session, because the presenting client cannot prove possession of the secret the transaction was bound to
- **AND** no session is established for the client that presented it

#### Scenario: Establishing the session requires the initiator's secret
- **GIVEN** a handoff code issued to the extension for a transaction bound to a secret
- **WHEN** the code is presented to the session endpoint without that secret, or with one that does not match
- **THEN** the exchange is refused
- **AND** the code is consumed, so a mismatched attempt cannot be followed by another guess

#### Scenario: An unbindable extension transaction never starts
- **GIVEN** a request for the extension target that carries no usable binding secret
- **WHEN** the backend handles the start endpoint
- **THEN** it refuses the request before the browser leaves for GitHub
- **AND** no state is minted, so an unbound extension transaction cannot exist

#### Scenario: Web sign-in keeps its own binding
- **GIVEN** a handoff code issued to a web target, whose transaction is bound by the callback cookie instead
- **WHEN** the code is presented to the session endpoint without a proof-of-possession secret
- **THEN** the exchange succeeds
- **AND** the extension's binding is not imposed on clients that are already bound another way

#### Scenario: Single use survives across sign-in surfaces
- **GIVEN** a handoff code issued to the extension
- **WHEN** it is presented to the session endpoint a second time, from any client
- **THEN** the second attempt is rejected
- **AND** no second session is established
