# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
