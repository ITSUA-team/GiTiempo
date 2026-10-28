# GitHub Sign-In Specification

## Purpose

Define backend GitHub sign-in for safely resolved existing and new accounts, with verified-email ownership checks, automatic first-workspace provisioning, and normal application sessions independent of GitHub App connections.

## Requirements

### Requirement: Backend Login-Scoped GitHub OAuth Flow

The backend MUST provide a login-scoped GitHub OAuth flow — a start, a callback, and a session-exchange endpoint, none requiring an authenticated session — that runs the OAuth exchange server-side using the existing OAuth App shared with authenticated account linking, requesting `user:email read:org read:project` upfront.

#### Scenario: Start redirects to GitHub authorization

- **WHEN** a guest activates GitHub sign-in and the browser requests the start endpoint for a given app (user or admin)
- **THEN** the backend redirects to the GitHub authorization URL with the sign-in OAuth App client id, the callback `<APP_URL>/auth/github/callback`, the `user:email read:org read:project` scopes, and a signed short-lived state that carries which app to return to
- **AND** it binds the transaction to the initiating browser, so a state authorized in one browser cannot complete sign-in in another

#### Scenario: Callback exchanges the code and hands off a one-time code

- **WHEN** GitHub redirects back to the callback endpoint with a valid state and an authorization code
- **THEN** the backend exchanges the code for a GitHub access token, reads the immutable GitHub identity and resolves the linked account or, for an unlinked identity, a safe existing-account or new-account candidate using verified emails, and redirects the browser to the app's `/auth/github/callback` SPA route with a short-lived one-time handoff code
- **AND** the handoff code is opaque and carries no account data, so the resolved email never appears in the redirect URL

#### Scenario: Session exchange returns the normal token pair

- **WHEN** the SPA posts a valid handoff code to the session endpoint
- **THEN** the backend verifies the initiator, rechecks identity ownership and membership, provisions a personal workspace if membership is still absent, persists the identity link and encrypted OAuth credentials atomically with the application session, and returns the normal access/refresh token pair, identical in shape to email/password login

#### Scenario: Cancelled or unverifiable attempt returns to login

- **WHEN** the user denies authorization, or the state cannot be verified as issued by the backend to the browser presenting it
- **THEN** the callback redirects to the app login page with a GitHub error indicator and no session is created

#### Scenario: Incomplete feature consent does not block valid sign-in
- **GIVEN** GitHub returns a valid identity and sufficient information to resolve an eligible existing account or new-account candidate but grants fewer additional scopes than requested
- **WHEN** the sign-in completes
- **THEN** the system SHALL establish the normal session and persist actual granted permissions
- **AND** GitHub features SHALL require only their own credential and permission prerequisites; missing OAuth scopes MUST NOT disable working App-backed features

#### Scenario: Rejected handoff does not create durable account access
- **GIVEN** the callback has staged a provider result but the handoff is expired, replayed, stale after disconnect, or fails initiator proof
- **WHEN** session exchange is attempted
- **THEN** the system MUST NOT establish a session or commit a local user, workspace, membership, staged link, or credentials
- **AND** expired staged secrets SHALL be cleared

### Requirement: GitHub Sign-In Authenticates Existing Members By Verified Email

The backend MUST resolve a linked GitHub ID to its owner before considering email. An unlinked identity may use verified-email matching only when the existing account also has durable proof of ownership of that normalized verified email; a local email value, invitation, or reservation alone is insufficient. Eligible zero-membership accounts SHALL receive automatic workspace provisioning after initiator verification. The JWT contract MUST remain unchanged, and another GitHub identity MUST NOT replace an existing link.

#### Scenario: Non-primary verified email signs in

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** a verified email on the GitHub account matches an existing member with active membership and that account's durable verified-email proof
- **THEN** the backend issues the normal session for that member, reusing their existing Firebase UID
- **AND** it does so whether or not that email is the account's primary address

#### Scenario: Unverified email never matches

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** an email on the GitHub account matches an existing member but is not verified
- **THEN** it is ignored during resolution
- **AND** it alone cannot produce a session

#### Scenario: No verified email matches a member

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** no verified email on the GitHub account safely matches an existing member with active membership
- **THEN** the callback resolves a safe zero-membership existing account or new-account candidate
- **AND** it issues a handoff for automatic provisioning if identity resolution succeeds
- **AND** no durable local account or workspace is created until initiator verification at exchange

#### Scenario: No verified email at all

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** the GitHub account has no verified email
- **THEN** the callback redirects to the login page with an email error indicator and no session is created

#### Scenario: Resolution happens before the handoff

- **GIVEN** the authorizing GitHub identity is not already linked
- **WHEN** the handoff code is redeemed
- **THEN** it identifies an already-resolved account or new-account candidate
- **AND** absence of an existing member alone does not reject the exchange
- **AND** ownership, verified-email mapping, and membership are rechecked before commit

#### Scenario: Linked identity survives email or login changes
- **GIVEN** the GitHub ID is linked to an eligible active GiTiempo member
- **WHEN** GitHub sign-in returns the same ID with changed email or login metadata
- **THEN** the backend SHALL resolve the linked member by ID without rebinding through email
- **AND** it SHALL refresh safe display metadata without changing identity ownership

#### Scenario: Linked inactive owner cannot fall through to email
- **GIVEN** the GitHub ID belongs to a GiTiempo user without an eligible active membership
- **WHEN** another user email also matches the provider response
- **THEN** the backend MUST resolve the linked owner and provision that owner's personal workspace if otherwise eligible
- **AND** it MUST NOT issue a handoff for the other user or transfer ownership

#### Scenario: Initial sign-in cannot replace another linked GitHub identity
- **GIVEN** an unlinked GitHub ID resolves by verified email to a user who already owns a different GitHub ID
- **WHEN** the backend attempts to complete sign-in
- **THEN** the backend MUST return a safe account-mismatch error without changing either link or issuing a session

### Requirement: Unmatched GitHub Sign-In Explains Itself
Login surfaces MUST explain recoverable GitHub identity-resolution or provisioning failures without implying that an invitation is required for an eligible new account. An unmatched verified account alone SHALL NOT produce a no-member rejection. Existing unknown-error recovery SHALL remain available.

#### Scenario: Eligible new account has no no-member failure
- **GIVEN** a GitHub identity has a safely usable verified email but no local member
- **WHEN** sign-in completes successfully
- **THEN** the client enters its automatically provisioned workspace
- **AND** it does not instruct the user to obtain an invitation or match an existing member

#### Scenario: Missing verified email gives actionable feedback
- **GIVEN** an unlinked GitHub account has no verified email
- **WHEN** the login surface receives the email error indicator
- **THEN** it explains the verified-email requirement
- **AND** it links to `https://github.com/settings/emails` for recovery

#### Scenario: No-member copy names the cause and links to GitHub
- **GIVEN** an older backend returns the no-member indicator during deployment
- **WHEN** a login surface displays the failure
- **THEN** it explains the legacy verified-email match failure and gives safe retry or alternative-sign-in guidance without showing a successful session
- **AND** it links to `https://github.com/settings/emails` without implying an invitation is required for eligible automatic provisioning

#### Scenario: Unrecognised indicator falls back to generic copy
- **GIVEN** the login surface receives an unrecognised error indicator
- **WHEN** it handles the error
- **THEN** it shows generic recoverable sign-in failure copy
- **AND** it does not present the attempt as a successful sign-in

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

### Requirement: Login Pages Offer GitHub Sign-In

The user-web and admin-web login pages MUST offer a **Continue with GitHub** action that starts the backend flow, gated per environment, and a callback route that completes it.

#### Scenario: Login button starts the backend flow

- **WHEN** a guest activates **Continue with GitHub** on a login page with GitHub sign-in enabled
- **THEN** the browser navigates to the API start endpoint for that app

#### Scenario: Callback route completes sign-in

- **WHEN** the SPA `/auth/github/callback` route loads with a handoff code
- **THEN** it exchanges the code for a session and redirects to the dashboard
- **AND** an error indicator instead redirects to the login page with a message

#### Scenario: Disabled per environment

- **WHEN** GitHub sign-in is disabled for the environment
- **THEN** the **Continue with GitHub** action is not shown

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

### Requirement: GitHub New Account Resolution Is Deterministic
When no immutable link exists, GitHub sign-in SHALL preserve active-member verified-email resolution and its primary-address tie-break only for existing accounts with durable proof for the same normalized verified email. If no active member safely matches, it SHALL resolve matching zero-membership accounts with the same proof before creating a user. Ambiguity or unproven ownership MUST fail safely without merging accounts or selecting by provider list order.

#### Scenario: One proven zero-membership account matches
- **GIVEN** no active member matches any verified GitHub email
- **AND** exactly one existing local account proves ownership of one of those verified emails
- **WHEN** the callback resolves the identity
- **THEN** it stages that account and reuses its Firebase UID at successful exchange

#### Scenario: Multiple zero-membership accounts match
- **GIVEN** no active member safely matches and multiple zero-membership accounts with durable proof match verified emails
- **WHEN** the verified primary email matches exactly one of those accounts
- **THEN** that account is selected
- **AND** without such a primary match the attempt is rejected as ambiguous without provisioning

#### Scenario: No local account matches
- **GIVEN** no linked account or local account with durable proof for a verified email exists
- **WHEN** the callback prepares a new-account candidate
- **THEN** it uses the verified primary email, or the sole verified email when there is no verified primary
- **AND** multiple verified emails without a verified primary produce an ambiguous-account failure
- **AND** unverified email and arbitrary provider ordering are never used

#### Scenario: Pending invite already provisioned the Firebase identity
- **GIVEN** a usable verified GitHub email belongs to a Firebase identity created for an invitation
- **AND** durable application creation provenance proves that exact UID, or verified Firebase authentication proves control of it
- **AND** no local membership exists
- **WHEN** the verified initiator completes the session exchange
- **THEN** the backend reuses that Firebase identity and provisions the personal workspace
- **AND** it does not reset credentials, infer email consent, or accept the invitation

#### Scenario: Existing unbound Firebase email match lacks provenance
- **GIVEN** Firebase contains an identity for the verified GitHub email without a local binding or durable application creation proof
- **WHEN** GitHub exchange cannot prove control of that Firebase identity
- **THEN** it rejects adoption and gives existing-provider authentication or credential-linking recovery guidance
- **AND** it does not issue a Firebase custom token, replace credentials, fabricate provenance from a pending invite, or provision a workspace

#### Scenario: Preclaimed manual-registration email cannot be adopted
- **GIVEN** an existing password account was created with an unverified email and has a matching local email value
- **WHEN** an unlinked GitHub identity proves that normalized email
- **THEN** the backend returns identity-proof recovery without issuing a session or staging the password account
- **AND** it does not bind the GitHub identity, merge accounts, transfer ownership, or create a workspace for the password account

#### Scenario: Firebase creation survives failed workspace provisioning
- **GIVEN** a verified exchange created a Firebase identity using its committed application creation reservation
- **AND** subsequent SQL provisioning failed
- **WHEN** a new proof-bound GitHub flow retries
- **THEN** the backend verifies the reservation's exact UID and email before reuse
- **AND** successful provisioning creates one account and workspace without deleting or replacing the Firebase identity

#### Scenario: Ownership changes after callback
- **GIVEN** a handoff contains a staged account candidate
- **WHEN** a competing link or account operation changes identity ownership before exchange
- **THEN** the exchange rechecks ownership and refuses an incompatible binding without transferring a link
- **AND** it commits no partial workspace, credentials, or session

### Requirement: GitHub First Workspace Provisioning Preserves Handoff Security
GitHub provisioning SHALL happen only after a valid, unexpired, single-use handoff proves its initiating client. Web browser binding, extension proof of possession, disconnect-generation checks, safe redirects, and OAuth/App credential separation MUST apply to existing and newly provisioned accounts alike.

#### Scenario: Abandoned callback does not create a workspace
- **GIVEN** GitHub callback stages a new-account candidate
- **WHEN** no verified session exchange completes
- **THEN** no durable local user, workspace, membership, or OAuth link is created
- **AND** staged secrets expire according to the existing handoff policy

#### Scenario: Invalid or replayed handoff cannot provision
- **GIVEN** a handoff is expired, replayed, stale after disconnect, or presented without valid initiator proof
- **WHEN** session exchange is attempted
- **THEN** the existing rejection and consumption rules apply
- **AND** it cannot create a workspace, identity link, OAuth credentials, or application session

#### Scenario: Extension sign-in provisions through the same policy
- **GIVEN** an extension flow has a configured destination and valid proof of possession
- **AND** the resolved account has zero memberships
- **WHEN** its handoff exchange succeeds
- **THEN** it receives the normal token pair for its newly created personal workspace
- **AND** the outcome returns through the configured extension destination

#### Scenario: New candidate becomes stale after a competing disconnect
- **GIVEN** a callback staged a new-account candidate before a local account existed
- **AND** a competing sign-in created that account and its GitHub link was then disconnected
- **WHEN** the older candidate is exchanged
- **THEN** the backend rejects it using the resolved account's authorization generation and disconnect time
- **AND** it does not restore the disconnected link or commit another workspace or session
