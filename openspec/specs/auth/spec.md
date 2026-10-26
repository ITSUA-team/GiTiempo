# Backend Authentication Specification

## Purpose

Define server-side authentication behavior for verifying identity, issuing API tokens, and enforcing authenticated access in the NestJS API.
## Requirements
### Requirement: Firebase Identity Verification

The backend MUST accept a Firebase identity token during login and verify it against the configured Firebase project before creating an authenticated API session. Verification failures MUST NOT issue API session tokens and MUST NOT create or modify local user records.

#### Scenario: Login with valid Firebase identity

- **GIVEN** a frontend client has authenticated a user with Firebase Auth
- **WHEN** the client sends the Firebase identity token to the API login endpoint
- **THEN** the backend verifies the token against the configured Firebase project
- **AND** the backend associates the verified identity with a local user record
- **AND** the backend emits a successful-login audit event

#### Scenario: Login with invalid Firebase identity

- **GIVEN** a frontend client sends an invalid, expired, tampered, or wrong-audience Firebase identity token
- **WHEN** the API login endpoint processes the request
- **THEN** the backend rejects the request as unauthorized
- **AND** no application session tokens are issued
- **AND** no local user record is created or modified
- **AND** the backend emits a Firebase-rejection audit event without logging the raw identity token

#### Scenario: Login endpoint rate limiting

- **GIVEN** many login attempts arrive from the same client within a short window
- **WHEN** the attempt count exceeds the per-route login throttle
- **THEN** the backend rejects further attempts as too many requests
- **AND** the rejection happens before any Firebase verification work is performed

### Requirement: API Session Token Pair

The backend SHALL issue an access token and refresh token pair after successful login for a user with active workspace membership. Access tokens MUST carry a minimal, non-sensitive payload suitable for stateless verification. Refresh tokens MUST be opaque, unguessable, stored only as a cryptographic hash at rest, and bound to the workspace membership selected when the session is issued.

#### Scenario: Successful login returns token pair with workspace context

- **GIVEN** the backend has verified the Firebase identity token
- **AND** the verified identity maps to a local user with active workspace membership
- **WHEN** the login flow completes successfully
- **THEN** the response includes an access token for authenticated API calls
- **AND** the response includes a refresh token for session renewal
- **AND** the access token carries the authenticated subject, email, Firebase UID, workspace ID, and workspace role claims

#### Scenario: Refresh token stays bound to the issued workspace membership

- **GIVEN** the backend issues a session for a specific active workspace membership during login or first-owner registration
- **WHEN** the backend persists the refresh token for that session
- **THEN** the persisted refresh-token record keeps the selected workspace membership context
- **AND** later refresh attempts evaluate membership against that stored workspace context instead of selecting a different active membership for the same user

#### Scenario: Refresh rotates session credentials for active member

- **GIVEN** a client presents a valid refresh token for a user with active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend invalidates the previous refresh token
- **AND** the backend returns a fresh access token and refresh token pair
- **AND** the new access token carries the user's current workspace ID and role claims

#### Scenario: Refresh is rejected after membership removal

- **GIVEN** a client presents a valid refresh token
- **AND** the session owner no longer has active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized

#### Scenario: Refresh with expired refresh token

- **GIVEN** a client presents a refresh token whose expiry has passed
- **WHEN** the refresh endpoint processes the request
- **THEN** the backend rejects the request as unauthorized
- **AND** no new token pair is issued

#### Scenario: Refresh with unknown refresh token

- **GIVEN** a client presents a refresh token whose hash does not match any stored session
- **WHEN** the refresh endpoint processes the request
- **THEN** the backend rejects the request as unauthorized
- **AND** refresh-token comparison uses a constant-time algorithm so that mismatch timing does not leak information

### Requirement: Refresh Token Reuse Detection

The backend MUST detect when a previously rotated (revoked) refresh token is presented again and MUST treat it as a session compromise event.

#### Scenario: Revoked refresh token is presented again

- **GIVEN** a refresh token has already been rotated and marked as revoked
- **WHEN** any client presents that revoked token to the refresh endpoint
- **THEN** the backend rejects the request as unauthorized
- **AND** the backend revokes every refresh token that belongs to the same session family
- **AND** the backend emits a reuse-detected audit event

### Requirement: Active Workspace Switch Issues Token Pair

The backend SHALL allow an authenticated user to switch the active workspace to another existing membership by issuing a fresh API token pair for the selected workspace context.

#### Scenario: Switch succeeds for another active membership

- **GIVEN** an authenticated user has an active membership in the current workspace
- **AND** the same user has an active membership in another workspace
- **WHEN** the user requests an active-workspace switch to the other workspace
- **THEN** the backend validates the target membership
- **AND** the backend returns a fresh access token and refresh token pair
- **AND** the new access token carries the selected workspace ID and the user's role in that selected workspace
- **AND** the previous refresh token from that session is no longer usable

#### Scenario: Switch rejects workspace without membership

- **GIVEN** an authenticated user does not have an active membership in a target workspace
- **WHEN** the user requests an active-workspace switch to that workspace
- **THEN** the backend rejects the request as forbidden
- **AND** no new token pair is issued

#### Scenario: Switch to current workspace is idempotent

- **GIVEN** an authenticated user requests an active-workspace switch to the workspace already carried by the current access token
- **WHEN** the backend validates that membership
- **THEN** the backend returns a fresh access token and refresh token pair for the same workspace context
- **AND** the previous refresh token from that session is no longer usable

#### Scenario: Switch rejects refresh token owned by another user

- **GIVEN** an authenticated user submits an active-workspace switch request
- **AND** the provided refresh token belongs to a different user
- **WHEN** the backend validates the switch request
- **THEN** the backend rejects the request as unauthorized
- **AND** no new token pair is issued

#### Scenario: Switch rejects refresh token from another workspace session

- **GIVEN** an authenticated user submits an active-workspace switch request
- **AND** the provided refresh token belongs to a different current workspace session than the caller's access-token workspace
- **WHEN** the backend validates the switch request
- **THEN** the backend rejects the request as unauthorized
- **AND** no new token pair is issued

### Requirement: Refresh Preserves Selected Workspace Context

The backend MUST refresh credentials for the workspace context associated with the refresh session and MUST NOT silently move the session to another workspace.

#### Scenario: Refresh after workspace switch

- **GIVEN** a user has switched the active workspace and received a new refresh token
- **WHEN** the client refreshes that switched session
- **THEN** the backend returns a new token pair for the selected workspace context
- **AND** the new access token keeps the selected workspace ID and selected-workspace role claims

#### Scenario: Refresh rejects removed selected membership

- **GIVEN** a refresh token belongs to a selected workspace membership that has been removed
- **WHEN** the client attempts to refresh that session
- **THEN** the backend rejects the request as unauthorized
- **AND** the backend does not automatically select another workspace membership for the user

### Requirement: Session Termination On Logout

The backend MUST provide a logout endpoint that terminates the current device's session without affecting other sessions of the same user.

#### Scenario: Logout invalidates current refresh token

- **GIVEN** an authenticated client presents its current refresh token to the logout endpoint
- **WHEN** the logout endpoint processes the request
- **THEN** the presented refresh token is invalidated and can no longer be used to refresh
- **AND** refresh tokens belonging to other sessions of the same user remain valid
- **AND** the backend emits a logout audit event

#### Scenario: Logout with unknown refresh token

- **GIVEN** a client presents a refresh token that is not recognized
- **WHEN** the logout endpoint processes the request
- **THEN** the backend does not leak whether the token existed
- **AND** the response does not issue a new token pair

### Requirement: Authenticated Request Enforcement

Protected backend endpoints MUST require a valid API access token in the `Authorization` header. The authenticated subject MUST be resolvable from the verified access token without an additional database round-trip during request authorization.

#### Scenario: Authenticated access to protected route

- **GIVEN** a client includes a valid access token in the `Authorization: Bearer` header
- **WHEN** the client calls a protected API endpoint
- **THEN** the backend allows the request to proceed
- **AND** the authenticated user context is available to downstream request handling
- **AND** that context includes the user's workspace ID and role

#### Scenario: Missing access token on protected route

- **GIVEN** a protected API endpoint is called without a valid bearer token
- **WHEN** the backend evaluates the request
- **THEN** the backend rejects the request as unauthorized

#### Scenario: Invalid or expired access token on protected route

- **GIVEN** a protected API endpoint is called with a bearer token whose signature, issuer, audience, or expiry is invalid
- **WHEN** the backend evaluates the request
- **THEN** the backend rejects the request as unauthorized
- **AND** the rejection does not disclose which specific check failed

#### Scenario: Public endpoint explicitly opted out

- **GIVEN** an endpoint is explicitly marked as public via the skip-auth marker
- **WHEN** the endpoint is called without any access token
- **THEN** the backend allows the request to proceed

#### Scenario: New endpoint without explicit opt-out

- **GIVEN** a newly added endpoint does not carry the skip-auth marker
- **WHEN** the endpoint is called without a valid access token
- **THEN** the backend rejects the request as unauthorized

### Requirement: Local User Upsert On First Login

The backend MUST ensure that successful login maps the verified identity to a local user record. Eligible social sign-in SHALL create that record when needed; returning login SHALL reuse it. Authenticated recovery of an original manual-registration reservation SHALL complete its local record under the registration contract. Other unsupported sign-in without membership MUST NOT create a local user.

#### Scenario: First login creates local user

- **GIVEN** a verified Google identity eligible for automatic workspace provisioning has no matching local user record
- **WHEN** the user completes the login flow
- **THEN** the backend creates a local user with the verified identity attributes
- **AND** future authenticated requests resolve to that same local user

#### Scenario: Returning login updates mapped user

- **GIVEN** a verified Firebase identity already maps to a local user record
- **WHEN** the user logs in again
- **THEN** the backend reuses the existing local user record
- **AND** the backend may refresh mutable profile fields sourced from the verified identity

#### Scenario: Returning login refreshes a provider-owned avatar

- **GIVEN** a mapped local user whose stored avatar is owned by the identity provider
- **AND** the verified identity supplies a picture that differs from the stored avatar
- **WHEN** the user logs in again
- **THEN** the backend replaces the stored avatar with the picture from the verified identity
- **AND** the avatar remains owned by the identity provider

#### Scenario: Returning login fills a missing avatar

- **GIVEN** a mapped local user with no stored avatar
- **AND** the verified identity supplies a picture
- **WHEN** the user logs in again
- **THEN** the backend stores that picture as the user's avatar
- **AND** the avatar is owned by the identity provider

#### Scenario: Returning login never replaces a user-owned avatar

- **GIVEN** a mapped local user whose stored avatar is owned by the user
- **AND** the verified identity supplies a different picture
- **WHEN** the user logs in again
- **THEN** the backend leaves the stored avatar unchanged
- **AND** the avatar remains owned by the user

#### Scenario: Login without a picture claim leaves the avatar intact

- **GIVEN** a mapped local user with a stored avatar
- **AND** the verified identity supplies no picture
- **WHEN** the user logs in again
- **THEN** the backend leaves the stored avatar unchanged
- **AND** the backend does not clear the avatar

#### Scenario: Invite acceptance applies the same avatar rules

- **GIVEN** a verified Firebase identity accepting a workspace invite for an existing local user record
- **WHEN** the backend synchronises that user record from the verified identity
- **THEN** the avatar is refreshed, filled, or preserved by the same ownership rules used on login

### Requirement: Sensitive Auth Data Redaction

The backend MUST avoid writing raw bearer tokens, Firebase identity tokens, or refresh tokens to logs, traces, or error payloads.

#### Scenario: Auth request is logged

- **WHEN** the backend logs a request that carries authorization headers or auth request bodies
- **THEN** the `Authorization` header value is masked in the log output
- **AND** request-body fields that carry Firebase identity tokens or refresh tokens are masked in the log output

#### Scenario: Auth error is reported

- **WHEN** the backend reports an authentication or refresh error
- **THEN** the error payload does not contain the raw bearer token, Firebase identity token, or refresh token

### Requirement: Membership-Gated Login
The backend MUST issue application sessions only for an active workspace membership. Verified Google or GitHub sign-in with zero memberships SHALL first create a personal workspace and admin membership. A backend-verified Firebase authentication proving the exact UID of a retained manual-registration reservation MAY complete that original foundation under its registration contract. Existing-workspace access remains invite-based. Other login providers without membership MUST be rejected, and refresh MUST NOT provision membership.

#### Scenario: Login succeeds for user with active membership
- **GIVEN** a verified identity maps to a local user with an active workspace membership
- **WHEN** the user logs in
- **THEN** the backend issues a token pair with workspace context claims
- **AND** it may refresh mutable profile fields according to the existing ownership rules
- **AND** it creates no workspace or additional membership

#### Scenario: Eligible social login has no active membership
- **GIVEN** a verified Google or GitHub identity resolves safely to a new account or an existing account with zero memberships
- **WHEN** the user completes sign-in
- **THEN** the backend provisions the personal workspace before issuing the normal session
- **AND** the token pair identifies the resulting admin membership

#### Scenario: Login is rejected without active membership
- **GIVEN** a verified identity does not map to an active workspace membership
- **AND** its verified sign-in method is not an eligible Google or GitHub login
- **AND** it does not prove the exact UID of a retained manual-registration reservation
- **WHEN** the user attempts to log in
- **THEN** the backend rejects the request as unauthorized (401)
- **AND** no local user, workspace, membership, or session is created

#### Scenario: Exact-UID pending registration recovery is a narrow exception
- **GIVEN** a backend-verified Firebase authentication proves control of the exact UID in a retained manual-registration reservation
- **WHEN** the identity has no active workspace membership
- **THEN** the backend may complete only that reservation's original foundation under the shared locks
- **AND** this exception does not require an email-verified claim, authorize ordinary password self-provisioning, or permit recovery by matching email alone

#### Scenario: Refresh is rejected when the issued workspace membership is gone
- **GIVEN** a client presents a valid refresh token issued for a specific active workspace membership
- **AND** the session owner no longer has that exact active workspace membership
- **WHEN** the refresh endpoint is called
- **THEN** the backend rejects the request as unauthorized (401)
- **AND** it neither provisions a workspace nor selects a different membership

#### Scenario: Registration is separate from login
- **GIVEN** a client submits email/password first-owner registration data
- **WHEN** registration is requested
- **THEN** the dedicated registration endpoint validates the registration contract including owner acknowledgement
- **AND** this does not require an additional registration form during eligible social sign-in

### Requirement: Registration Session Issuance
The backend SHALL issue the normal API token pair after successful first-owner registration.

#### Scenario: Successful registration returns owner session
- **GIVEN** registration has created a Firebase identity, local user, workspace, and active owner membership
- **WHEN** the registration response is produced
- **THEN** the response includes an access token for authenticated API calls
- **AND** the response includes a refresh token for session renewal
- **AND** the access token carries the registered user's subject, email, Firebase UID, workspace ID, and owner role claims

### Requirement: Verified Social Email Identifies One Account
Google and GitHub with the same normalized verified email SHALL resolve to one account only when the incoming identity and the existing account both prove ownership of that email. Additional verified Firebase subjects MAY bind while the canonical UID stays stable. Conflicting owners MUST fail without merging or duplicate onboarding. Unverified email cannot establish account equivalence.

#### Scenario: Google account later signs in through GitHub
- **GIVEN** Google sign-in established an account with a verified email
- **WHEN** an unlinked GitHub identity proves the same verified email without a conflicting link
- **THEN** it resolves to the existing local account and canonical Firebase UID
- **AND** it reuses that account's memberships without creating a second workspace

#### Scenario: GitHub account later signs in through Google
- **GIVEN** GitHub sign-in established an account with a verified email
- **WHEN** Google sign-in proves the same verified email on the canonical UID or an unbound Firebase subject
- **THEN** it resolves to that same account and memberships
- **AND** it does not create a second local user or workspace

#### Scenario: Same verified email returns an unbound Firebase subject
- **GIVEN** a local account has durable evidence that its canonical identity or a proven social binding owns the verified email and has a canonical Firebase UID
- **WHEN** verified Google authentication returns a different Firebase UID not owned by another local user
- **THEN** it binds that subject to the existing local account and reuses its memberships
- **AND** subsequent sign-in by that subject resolves the same owner even after a provider email change
- **AND** it does not replace the canonical UID or create another local account or workspace

#### Scenario: UID and email resolve to different accounts
- **GIVEN** a verified token's canonical or additionally bound subject and verified email identify different local users
- **WHEN** account resolution runs
- **THEN** it rejects the contradictory identity without issuing a session or changing either account

#### Scenario: Unverified email cannot link accounts
- **GIVEN** provider email is not verified
- **WHEN** it matches another account's email
- **THEN** that match does not authorize cross-provider linking or new social provisioning

#### Scenario: Verified social email cannot adopt an unverified password account
- **GIVEN** an existing email/password account stores an email but lacks evidence that it owns that normalized verified email
- **WHEN** Google or GitHub proves that same email for the incoming identity
- **THEN** the backend returns safe identity-proof recovery without issuing a session
- **AND** it does not bind a subject, merge accounts, transfer ownership, or create a workspace for the pre-existing account

#### Scenario: Existing proof is never inferred from local data
- **GIVEN** an existing account has only a matching local email value, pending invitation, or application creation reservation
- **WHEN** a verified social identity presents that normalized email
- **THEN** those records do not establish existing-account ownership
- **AND** the backend does not backfill verification evidence from them

#### Scenario: Both providers create the same verified account concurrently
- **GIVEN** neither provider has an existing local account with conflicting or unproven ownership for the same verified email
- **WHEN** Google and GitHub sign-in race
- **THEN** compatible attempts converge on one canonical account and workspace
- **AND** an incompatible Firebase binding is rejected without a duplicate account or workspace

### Requirement: Automatic Social Workspace Foundation
The system SHALL create a workspace named exactly `Workspace`, its default settings, and an `admin` membership for the safely resolved account when verified Google or GitHub sign-in finds zero memberships. It SHALL use verified provider information to identify eligibility and MUST NOT trust a provider assertion supplied in the request body.

#### Scenario: New Google account receives a workspace
- **GIVEN** a Google identity verified by the backend has no local user or membership
- **WHEN** its login exchange succeeds
- **THEN** one local user, one workspace named `Workspace`, default settings including the existing default time zone, and one admin membership exist
- **AND** the response uses the existing API token-pair shape and workspace claims

#### Scenario: Existing account without memberships receives a workspace
- **GIVEN** a safely resolved account already exists but has zero memberships
- **WHEN** verified Google or GitHub sign-in completes
- **THEN** the existing local user and Firebase identity are reused
- **AND** the new workspace and admin membership belong to that user

#### Scenario: Existing memberships preserve workspace selection
- **GIVEN** the resolved account has one or more memberships
- **WHEN** social sign-in completes
- **THEN** it creates no workspace
- **AND** it selects the existing membership by earliest joined time, breaking ties by ascending workspace ID

#### Scenario: Forged eligibility does not provision
- **GIVEN** a client claims Google sign-in but the verified identity indicates a different provider
- **WHEN** the backend evaluates a zero-membership account
- **THEN** it does not provision based on the client claim

### Requirement: Social Provisioning Is Atomic And Idempotent
The system MUST serialize provisioning for the same account and recheck membership before creation. Local user creation, workspace foundation, and session persistence SHALL commit together. A failed attempt MUST NOT expose a partial workspace or issue usable credentials for uncommitted membership.

#### Scenario: Simultaneous social sign-ins
- **GIVEN** the same account has zero memberships
- **WHEN** two eligible sign-ins run concurrently, including through different providers
- **THEN** at most one workspace foundation is created
- **AND** successful sessions reference the same resulting membership

#### Scenario: Retry after a lost successful response
- **GIVEN** provisioning committed but the client did not receive the response
- **WHEN** the account signs in again
- **THEN** its existing membership is reused without another workspace

#### Scenario: Persistence or token issuance fails
- **GIVEN** a social sign-in requires provisioning
- **WHEN** persistence or token issuance fails before commit
- **THEN** no new local workspace, settings, membership, or refresh session from that attempt is committed
- **AND** no usable application token pair is returned
- **AND** an existing Firebase identity is not deleted

#### Scenario: Concurrent invite acceptance commits first
- **GIVEN** an account has zero memberships when sign-in begins
- **WHEN** explicit invite acceptance commits a membership before the sign-in's serialized creation decision
- **THEN** sign-in uses the existing membership and does not create a personal workspace

### Requirement: Social Provisioning Leaves Invitations And Consent Explicit
Social sign-in MUST NOT accept invitations, record owner acknowledgement, or grant email consent. A pending invitation SHALL NOT prevent personal-workspace provisioning for an account with zero memberships. Manual registration acknowledgement semantics remain governed by the registration contract.

#### Scenario: Pending invitation remains separate
- **GIVEN** a safely resolved account has a pending invitation and no memberships
- **WHEN** ordinary Google or GitHub sign-in completes
- **THEN** it creates the personal workspace
- **AND** the invitation remains pending without membership in the invited workspace

#### Scenario: Invitation does not supply missing identity proof
- **GIVEN** a pre-existing unbound Firebase identity lacks application creation provenance or verified Firebase control
- **WHEN** GitHub exchange attempts to reuse that identity
- **THEN** the normal identity-proof recovery requirement applies whether or not an invitation is pending
- **AND** the invitation itself neither authorizes identity adoption nor prevents provisioning after safe resolution

#### Scenario: Invitation is accepted later
- **GIVEN** social sign-in created the personal workspace
- **WHEN** the user explicitly accepts a valid invitation for their identity
- **THEN** the invited membership is created through normal invite acceptance
- **AND** their personal workspace remains available

#### Scenario: No inferred acknowledgement or email consent
- **GIVEN** social sign-in provisions a workspace automatically
- **WHEN** provisioning finishes
- **THEN** no naming or owner-confirmation step is required
- **AND** no acknowledgement or email-consent flag, timestamp, or consent event is inferred from sign-in
- **AND** existing consent preferences are preserved
