## MODIFIED Requirements

### Requirement: Backend Login-Scoped GitHub OAuth Flow

The backend MUST provide a login-scoped GitHub OAuth flow — a start, a callback, and a session-exchange endpoint, none requiring an authenticated session — that runs the OAuth exchange server-side using the existing OAuth App shared with authenticated account linking, requesting `user:email read:org read:project` upfront.

#### Scenario: Start redirects to GitHub authorization

- **WHEN** a guest activates GitHub sign-in and the browser requests the start endpoint for a given app (user or admin)
- **THEN** the backend redirects to the GitHub authorization URL with the sign-in OAuth App client id, the callback `<APP_URL>/auth/github/callback`, the `user:email read:org read:project` scopes, and a signed short-lived state that carries which app to return to
- **AND** it binds the transaction to the initiating browser, so a state authorized in one browser cannot complete sign-in in another

#### Scenario: Callback exchanges the code and hands off a one-time code

- **WHEN** GitHub redirects back to the callback endpoint with a valid state and an authorization code
- **THEN** the backend exchanges the code for a GitHub access token, reads the immutable GitHub identity and resolves the existing member by the linked identity or, for an unlinked identity, the existing verified-email rules, and redirects the browser to the app's `/auth/github/callback` SPA route with a short-lived one-time handoff code
- **AND** the handoff code is opaque and carries no account data, so the resolved email never appears in the redirect URL

#### Scenario: Session exchange returns the normal token pair

- **WHEN** the SPA posts a valid handoff code to the session endpoint
- **THEN** the backend verifies the initiator, rechecks membership and identity ownership, persists the identity link and encrypted OAuth credentials, and returns the normal access/refresh token pair, identical in shape to email/password login

#### Scenario: Cancelled or unverifiable attempt returns to login

- **WHEN** the user denies authorization, or the state cannot be verified as issued by the backend to the browser presenting it
- **THEN** the callback redirects to the app login page with a GitHub error indicator and no session is created

#### Scenario: Incomplete feature consent does not block valid sign-in
- **GIVEN** GitHub returns a valid identity and sufficient information to resolve an eligible existing member but grants fewer additional scopes than requested
- **WHEN** the sign-in completes
- **THEN** the system SHALL establish the normal session and persist actual granted permissions
- **AND** GitHub features SHALL require only their own credential and permission prerequisites; missing OAuth scopes MUST NOT disable working App-backed features

#### Scenario: Rejected handoff does not create durable account access
- **GIVEN** the callback has staged a provider result but the handoff is expired, replayed, stale after disconnect, or fails initiator proof
- **WHEN** session exchange is attempted
- **THEN** the system MUST NOT establish a session or commit the staged link or credentials
- **AND** expired staged secrets SHALL be cleared

### Requirement: GitHub Sign-In Authenticates Existing Members By Verified Email

For an unlinked GitHub identity only, the backend MUST establish the session by matching an existing member with an active membership against **any verified** email on the authorizing GitHub account, and MUST reuse that member's existing Firebase UID. An unverified email MUST NOT match. It MUST resolve the member during the callback, before the handoff is created, so that a failure to match is reported as an error indicator rather than an opaque exchange rejection. It MUST NOT provision new users or change the JWT contract. A successful sign-in SHALL persist an identity link and OAuth credentials after initiator verification. An existing link SHALL take precedence over email matching, and an inactive linked owner MUST NOT cause fallback to another user.

#### Scenario: Non-primary verified email signs in

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** a verified email on the GitHub account matches an existing member with an active membership
- **THEN** the backend issues the normal session for that member, reusing their existing Firebase UID
- **AND** it does so whether or not that email is the account's primary address

#### Scenario: Unverified email never matches

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** an email on the GitHub account matches an existing member but is not verified
- **THEN** it is ignored during resolution
- **AND** it alone cannot produce a session

#### Scenario: No verified email matches a member

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** no verified email on the GitHub account matches an existing member with an active membership
- **THEN** the callback redirects to the login page with a no-member error indicator
- **AND** no handoff code is issued and no user is created

#### Scenario: No verified email at all

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** the GitHub account has no verified email
- **THEN** the callback redirects to the login page with an email error indicator and no session is created

#### Scenario: Resolution happens before the handoff

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** the handoff code is redeemed
- **THEN** it identifies an already-resolved member
- **AND** the exchange cannot fail because no member matched

#### Scenario: Linked identity survives email or login changes
- **GIVEN** the GitHub ID is linked to an eligible active GiTiempo member
- **WHEN** GitHub sign-in returns the same ID with changed email or login metadata
- **THEN** the backend SHALL resolve the linked member by ID without rebinding through email
- **AND** it SHALL refresh safe display metadata without changing identity ownership

#### Scenario: Linked inactive owner cannot fall through to email
- **GIVEN** the GitHub ID belongs to a GiTiempo user without an eligible active membership
- **WHEN** another user email also matches the provider response
- **THEN** the backend MUST refuse the sign-in
- **AND** it MUST NOT issue a handoff for the other user or transfer ownership

#### Scenario: Initial sign-in cannot replace another linked GitHub identity
- **GIVEN** an unlinked GitHub ID resolves by verified email to a user who already owns a different GitHub ID
- **WHEN** the backend attempts to complete sign-in
- **THEN** the backend MUST return a safe account-mismatch error without changing either link or issuing a session

### Requirement: Ambiguous GitHub Sign-In Prefers The Primary Address

For an unlinked GitHub identity, when more than one member with an active membership matches the verified emails on a single GitHub account, the backend MUST sign in as the member matched by the account's primary address. When the primary address resolves no member, or resolves one that is not among the matches, the backend MUST refuse the sign-in rather than select by any other ordering, and the login surfaces MUST direct the member to sign in with their email address instead.

#### Scenario: Primary address breaks the tie

- **WHEN** the verified emails match more than one member with an active membership
- **AND** the account's primary address matches one of those members
- **THEN** the backend issues the handoff for that member
- **AND** the sign-in completes as it would for a single match

#### Scenario: Several matches without a usable primary refuse the sign-in

- **WHEN** the verified emails match more than one member with an active membership
- **AND** the account's primary address matches no member among them
- **THEN** the callback redirects to the login page with an ambiguous-account error indicator
- **AND** no handoff code is issued and no session is created

#### Scenario: No other ordering is consulted

- **WHEN** the sign-in is refused as ambiguous
- **THEN** no member is chosen by list order, recency, or any other property
- **AND** the primary address is the only tie-break the backend applies

#### Scenario: Ambiguous copy directs to email sign-in

- **WHEN** a login surface receives the ambiguous-account error indicator
- **THEN** it explains that the GitHub account matches more than one GiTiempo account
- **AND** it directs the member to sign in with their email address instead

### Requirement: GitHub Sign-In Stays Independent Of The GitHub App Integration

The sign-in and account-link flows MUST use the existing OAuth App credentials and persist OAuth identity/access separately from personal GitHub App credentials. Sign-in SHALL create or refresh the account link but MUST NOT create, replace, refresh or imply authorization of the personal App grant. The CSRF state and session handoff MUST NOT be usable as session tokens.

#### Scenario: OAuth sign-in preserves App credentials
- **GIVEN** a user has an existing personal GitHub App grant for the same ID
- **WHEN** the user successfully signs in with OAuth
- **THEN** the system SHALL persist OAuth access separately
- **AND** it MUST NOT overwrite the App grant or change installation access

#### Scenario: State and handoff cannot mint a session directly
- **GIVEN** a caller holds OAuth state or a handoff code
- **WHEN** the caller presents it to a normal authenticated endpoint
- **THEN** the endpoint MUST reject it as an application access token

### Requirement: Extension GitHub Sign-In Returns Through A Configured Extension Destination
The backend GitHub sign-in flow SHALL accept an extension login target, and for that target SHALL return the browser to a redirect destination read from backend configuration on every outcome. Because a browser may derive its own extension redirect host, the backend SHALL keep one configured destination per supported browser and select between them by a discriminator carried on the request. That discriminator names a configured destination; it MUST NOT supply one. The backend MUST NOT take a destination from the request, and MUST fail closed when the destination for the named browser is not configured.

#### Scenario: Extension target starts the flow
- **GIVEN** GitHub sign-in and an extension redirect destination are configured for the backend
- **WHEN** the browser requests the start endpoint for the extension target
- **THEN** the backend redirects to GitHub authorization exactly as it does for the web targets
- **AND** the signed state records that the extension started the flow

#### Scenario: Success returns the handoff code to the extension
- **GIVEN** an extension-initiated flow returns from GitHub with a verifiable state and an authorization code
- **WHEN** the backend resolves the linked identity or an unlinked identity through verified-email matching
- **THEN** it redirects the browser to the configured extension destination carrying a one-time handoff code
- **AND** it does not redirect to a web app route

#### Scenario: Failure returns to the extension rather than a web login page
- **GIVEN** an extension-initiated flow
- **WHEN** the user denies authorization, the state cannot be verified, no eligible identity can be resolved, or the code exchange fails
- **THEN** the backend redirects the browser to the configured extension destination carrying an error indicator
- **AND** it does not redirect to a web app login page, so the extension's authorization window always reaches a destination it can observe

#### Scenario: The outcome returns to the browser that began the flow
- **GIVEN** destinations are configured for more than one browser
- **WHEN** an extension-initiated flow names one of them at the start endpoint
- **THEN** the signed state records that browser alongside the login target
- **AND** every outcome of that flow returns to the destination configured for it, not to another browser's

#### Scenario: An unrecognized or absent browser resolves to the default
- **GIVEN** an extension-target request names no browser, or names one the backend does not recognize
- **WHEN** the backend resolves the destination
- **THEN** it uses the default browser's configured destination
- **AND** a state signed before browsers were distinguished still resolves to that same destination

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
- **GIVEN** the backend has no redirect destination configured for the browser an extension-target flow names
- **WHEN** that flow is attempted
- **THEN** the backend reports the flow as unavailable before the browser leaves for GitHub
- **AND** no partial or defaulted destination is used, and another browser's destination is never substituted
