## MODIFIED Requirements

### Requirement: Profile Identity Surface

The profile page MUST expose editable profile information, API-backed GitHub connection state, and sign-out access.

#### Scenario: Profile page shows connection card

- GIVEN the user opens their profile page
- WHEN the page renders
- THEN it shows the editable display-name surface
- AND it shows the GitHub connection state card
- AND it provides a sign-out action

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
- **AND** successful disconnect updates or refreshes the card to the disconnected state
- **AND** failed disconnect keeps the previous connection state and shows an error toast

#### Scenario: Profile GitHub connect request fails before redirect

- **GIVEN** the Profile page renders a disconnected or reconnectable GitHub connection card
- **WHEN** the GitHub authorization URL request fails
- **THEN** the page shows an error toast using the repository error-message order
- **AND** the card exits the redirecting/connecting state
- **AND** the page leaves the user in a retryable state instead of navigating away

#### Scenario: Profile handles GitHub callback query outcome

- **GIVEN** GitHub redirects the user back to `/profile` with a safe callback outcome query
- **WHEN** the Profile page initializes
- **THEN** the page surfaces the outcome with a standard PrimeVue toast notification only
- **AND** the page does not render an inline success or error banner for the callback outcome
- **AND** the handled callback query parameters are removed from the URL without adding another history entry

#### Scenario: Profile handles GitHub callback error outcome

- **GIVEN** GitHub redirects the user back to `/profile` with a safe callback error query
- **WHEN** the Profile page initializes
- **THEN** the page surfaces the error with a standard PrimeVue error toast notification only
- **AND** the page does not render an inline error banner for the callback outcome
- **AND** the handled callback query parameters are removed from the URL without adding another history entry

#### Scenario: Profile feature boundaries stay scoped

- **WHEN** the Profile page implementation is updated
- **THEN** GitHub connection state and actions remain scoped to the GitHub connection feature surface
- **AND** editable current-user identity behavior remains scoped to the current-user identity surface
- **AND** the page does not introduce a second overlapping `/users/me` client boundary when an existing current-user client already owns that endpoint family
- **AND** unrelated Profile sections are not merged into a single broad composable without a concrete shared state or lifecycle requirement

#### Scenario: Profile GitHub states remain verifiable

- **WHEN** the Profile GitHub connection UI is implemented or updated
- **THEN** fetch-boundary behavior is covered for request paths, auth headers, response parsing, and API error propagation
- **AND** page or composable tests cover loading, request-error, disconnected, connected, redirecting/connecting, callback success toast, callback error toast, connect failure, disconnect success, and disconnect failure behavior
- **AND** frontend lint and typecheck pass for user-web
