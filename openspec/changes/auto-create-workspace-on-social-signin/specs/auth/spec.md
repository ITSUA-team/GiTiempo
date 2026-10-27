# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Paired Google Proof Can Establish Incoming Verified Email
For Google-authenticated Firebase tokens lacking verified email, the backend MAY accept a separately verified Google ID token bound to the same signed Google subject. It MUST enforce configured token trust, verified email, live identity availability and existing-account ownership without changing canonical identity or trusting client profile data.

#### Scenario: Google token supplies missing verified email
- **GIVEN** verified Google Firebase authentication lacks verified email
- **AND** an independently verified Google ID token proves the same signed Google subject and a verified email
- **WHEN** the live identity and existing-account ownership checks succeed
- **THEN** normal account resolution binds the incoming Firebase subject and reuses or creates the eligible foundation atomically
- **AND** canonical application JWT identity remains unchanged
- **AND** Google signature, issuer, configured audience, authorized party when present, expiry and issued-at claims are verified
- **AND** its nonempty email has boolean `email_verified=true` and its subject matches the single signed Firebase Google subject
- **AND** the live Firebase UID is enabled with that same provider subject under the identity locks, and any present token or live email agrees

#### Scenario: Alternate Google proof is invalid or contradictory
- **GIVEN** the optional proof has invalid signature, issuer, audience, authorized party or time claims, unverified email, or a mismatching subject or email
- **WHEN** login evaluates it
- **THEN** authentication fails without a local user, workspace, binding or session write
- **AND** no raw credential is logged or persisted

#### Scenario: Missing proof or unavailable live identity cannot bypass checks
- **GIVEN** Firebase lacks verified email and the alternate proof is absent, its configured audience allowlist is empty, or its live identity is deleted, disabled or no longer has the matching Google subject
- **WHEN** login is attempted
- **THEN** the backend rejects the attempt without changing identity ownership or granting access

#### Scenario: Existing verified Firebase email remains compatible
- **GIVEN** the verified Firebase token already proves Google sign-in and verified email
- **WHEN** login is submitted without the optional Google proof
- **THEN** the existing verified-Firebase path and token-pair response remain supported

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
