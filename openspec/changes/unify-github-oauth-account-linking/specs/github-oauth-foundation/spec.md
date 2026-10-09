## MODIFIED Requirements

### Requirement: GitHub Connection Status

The system SHALL return the current user's safe identity metadata, independent OAuth and personal App capabilities, and server-derived disconnect eligibility. A connected identity MUST NOT imply that every GitHub function is authorized. Workspace installation state SHALL remain separately workspace-scoped.

#### Scenario: No active link
- **GIVEN** a user has no active GitHub identity link
- **WHEN** connection status is requested
- **THEN** status SHALL be disconnected and account SHALL be null
- **AND** OAuth and personal-data capabilities SHALL require authorization; no token or verifier material SHALL be exposed

#### Scenario: OAuth identity with no personal App grant
- **GIVEN** a user has OAuth identity and effective read:org access but no personal App grant
- **WHEN** connection status is requested
- **THEN** status SHALL be connected and safe account metadata SHALL be returned
- **AND** organization discovery SHALL be ready and personal data SHALL require authorization

#### Scenario: Legacy App grant without OAuth
- **GIVEN** a user has an unambiguous migrated identity and usable App credentials but no OAuth grant
- **WHEN** connection status is requested
- **THEN** personal-data access SHALL remain available under existing provider and workspace rules
- **AND** organization discovery SHALL require OAuth authorization

#### Scenario: Missing scope preserves other capabilities
- **GIVEN** a user has an identity and OAuth access without effective read:org permission
- **WHEN** connection status is requested
- **THEN** the response SHALL report the missing permission and require recovery for organization discovery
- **AND** it MUST NOT expose tokens or mark unrelated App-backed functions unavailable

### Requirement: GitHub Authorization URL Creation

The system SHALL expose separate authenticated authorization starts for OAuth account linking and personal GitHub App data access. Each SHALL use unguessable opaque server-side state, PKCE, expiry, initiating user/session binding, authorization generation, and an explicit provider/purpose. OAuth account linking SHALL request user:email, read:org and read:project. Personal App authorization SHALL retain the existing App client and require a linked identity.

#### Scenario: User starts OAuth account linking
- **GIVEN** an authenticated user chooses Connect GitHub
- **WHEN** the system creates the authorization URL
- **THEN** the URL SHALL use the existing sign-in OAuth App and all three agreed scopes
- **AND** the state SHALL bind the current user/session to account linking without granting a new login session

#### Scenario: User authorizes App data
- **GIVEN** an authenticated user has a GitHub identity link
- **WHEN** the user starts personal data authorization
- **THEN** the existing GitHub App client and App callback SHALL be used
- **AND** the requested operation MUST NOT silently become OAuth account linking

### Requirement: GitHub OAuth Callback Completion

The system SHALL atomically consume authenticated authorization state before exchanging a code, then verify the provider identity and the state's user/session, purpose, generation and ownership before storing credentials. OAuth and personal App grants SHALL belong to the same immutable GitHub ID. Linking SHALL never switch the current GiTiempo user.

#### Scenario: OAuth account callback succeeds
- **GIVEN** an authenticated linking state is valid, current and unconsumed
- **WHEN** the callback exchanges the code and verifies the GitHub identity
- **THEN** the link and OAuth credentials SHALL be stored atomically for the initiating user
- **AND** existing matching App credentials SHALL remain intact

#### Scenario: Concurrent or replayed state
- **GIVEN** two callbacks use the same state, or one reuses consumed state
- **WHEN** the system claims the state
- **THEN** at most one callback SHALL succeed
- **AND** callbacks that cannot claim state MUST NOT exchange the code

#### Scenario: Expired or wrong-purpose callback
- **GIVEN** the state is expired, bound to an invalid session, has another purpose, or was invalidated by disconnect
- **WHEN** a callback is received
- **THEN** the callback MUST be rejected without creating or updating a link or credentials

#### Scenario: GitHub account belongs to another user
- **GIVEN** the verified GitHub ID is already linked to another GiTiempo user in any workspace
- **WHEN** the current user attempts to link it
- **THEN** the callback MUST fail with a stable safe conflict error
- **AND** neither ownership nor credentials SHALL change and the error MUST NOT identify the other user

#### Scenario: App identity differs from OAuth identity
- **GIVEN** a user owns one GitHub identity
- **WHEN** the App callback returns a different GitHub ID
- **THEN** the callback MUST fail with a safe identity-mismatch error
- **AND** it MUST NOT overwrite either credential family

#### Scenario: Same user reconnects
- **GIVEN** the GitHub ID is already linked to the initiating user
- **WHEN** that user successfully repeats authorization
- **THEN** the matching credential family SHALL be updated without duplicate ownership or modification of the other family


#### Scenario: OAuth linking cannot replace a different linked identity
- **GIVEN** the user is already linked to GitHub ID A
- **WHEN** authenticated OAuth account linking returns GitHub ID B
- **THEN** the system MUST reject with a safe identity-mismatch error and require explicit full Disconnect before replacement
- **AND** it MUST NOT change the existing identity metadata or either credential family


#### Scenario: Callback purpose cannot fall through to another flow
- **GIVEN** an account-link state is invalid, expired, consumed or revoked
- **WHEN** it reaches the shared OAuth callback
- **THEN** the callback MUST reject it as an account-link failure
- **AND** it MUST NOT retry it as sign-in state or establish a session

### Requirement: GitHub Token Storage And Refresh

The system SHALL encrypt personal credentials and route token retrieval and refresh explicitly by credential family. OAuth grant scopes and optional expiry/refresh metadata SHALL reflect actual provider responses. Tokens, secrets and verifiers MUST NOT enter public responses, redirects or logs.

#### Scenario: OAuth token has no refresh token
- **GIVEN** OAuth returns a valid access token with no refresh token or expiry
- **WHEN** the system stores the grant
- **THEN** the grant SHALL remain usable according to provider validity
- **AND** the system MUST NOT invent App-style expiry or require an App refresh token

#### Scenario: An expiring token needs refresh
- **GIVEN** a stored OAuth or App token is expired or near expiry and has refresh credentials
- **WHEN** an internal operation requests that credential family
- **THEN** the system SHALL use only that family's configured client to refresh
- **AND** rotated values SHALL be encrypted and committed only if the link and authorization generation remain current

#### Scenario: Provider rejects refresh
- **GIVEN** the provider rejects one family's refresh token
- **WHEN** a dependent operation requests access
- **THEN** the system MUST NOT return the invalid token or fall back to another credential family
- **AND** it SHALL require reauthorization for that family while preserving identity ownership and other valid grants

#### Scenario: Refresh races with Disconnect
- **GIVEN** refresh began before full Disconnect
- **WHEN** the provider response arrives after unlink
- **THEN** the refreshed credentials MUST NOT be persisted or made available to a new operation

### Requirement: GitHub Disconnect

The system SHALL support full personal GitHub unlink after verifying another usable sign-in method for the same GiTiempo user. Full unlink SHALL remove identity ownership and both personal credential families, invalidate pending personal flows, and release the GitHub ID. It MUST NOT uninstall workspace Apps, remove organization policy, delete imported/history records, or change existing timer authorization.

#### Scenario: Full unlink succeeds
- **GIVEN** a linked user has a server-verified usable alternative sign-in method
- **WHEN** the user confirms Disconnect
- **THEN** the system SHALL remove the active identity link and all personal OAuth/App credentials and invalidate pending flows
- **AND** subsequent status SHALL be disconnected and the GitHub ID SHALL be available to another user
- **AND** workspace installations, policy, projects, tasks, time history and current GiTiempo sessions SHALL be preserved

#### Scenario: Only GitHub login is available
- **GIVEN** no supported alternative sign-in method is verified for the user
- **WHEN** Disconnect is requested
- **THEN** the system MUST refuse before modifying identity or credentials
- **AND** it SHALL return guidance to establish an alternative sign-in method

#### Scenario: Alternative login verification is unavailable
- **GIVEN** the backend cannot verify alternative login availability
- **WHEN** Disconnect is requested
- **THEN** the system MUST return a retryable verification error without unlinking
- **AND** it MUST NOT trust a client claim or email address as proof

#### Scenario: Provider revocation fails
- **GIVEN** local unlink is authorized but token-specific provider revocation fails or times out
- **WHEN** the system completes Disconnect
- **THEN** local identity and credentials SHALL still be removed
- **AND** the response SHALL safely distinguish completed local unlink from unconfirmed provider revocation
- **AND** installation credentials MUST NOT be revoked

#### Scenario: Pending authorization cannot restore a removed link
- **GIVEN** a personal link/login callback or refresh was initiated before Disconnect
- **WHEN** it later attempts to commit credentials or establish a GitHub session
- **THEN** the system MUST reject the stale completion without recreating access

#### Scenario: Repeated disconnect is idempotent
- **GIVEN** no active link or personal credentials remain
- **WHEN** Disconnect is requested again
- **THEN** the system SHALL return successful local unlink without requiring a provider lookup

#### Scenario: New login can recreate the link
- **GIVEN** a user disconnected GitHub and later explicitly starts a new GitHub login
- **WHEN** identity resolution and unique ownership checks succeed
- **THEN** the successful login SHALL create a new link under the same initial sign-in rules
