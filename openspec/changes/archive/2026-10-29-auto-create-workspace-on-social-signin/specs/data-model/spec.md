# Spec Delta

## MODIFIED Requirements

### Requirement: Firebase-Backed User Identity
Each local user record MUST have one unique canonical Firebase identity and MAY own additional proven Firebase subjects. Every subject MUST identify at most one local user across canonical and additional bindings. Compatible Google and GitHub sign-ins with the same normalized verified email SHALL use one local account. Email matching MUST NOT replace a canonical UID or merge contradictory identities.

#### Scenario: Firebase identity maps to local user
- **GIVEN** a verified Firebase identity signs in
- **WHEN** the backend resolves the local user record
- **THEN** the lookup uses the unique Firebase UID across canonical and additional bindings
- **AND** the same Firebase UID cannot belong to more than one user record

#### Scenario: Verified email already has a canonical account
- **GIVEN** a local user already owns a normalized verified email
- **WHEN** another social sign-in proves the same email with compatible identity bindings
- **THEN** it resolves to that user and preserves the canonical UID
- **AND** incompatible bindings are rejected without merging or creating a second account

## ADDED Requirements

### Requirement: Application Identity Creation Is Recoverable
The backend SHALL durably reserve a unique normalized email and explicit Firebase UID before creating a new GitHub, invitation, or manual-registration identity. It SHALL retain purpose, lifecycle state, and timestamps for reconciliation. A manual-registration reservation also retains its original validated non-secret foundation payload, never a password. A reservation grants neither application access nor email-ownership proof.

#### Scenario: Reservation precedes external creation
- **GIVEN** no safely reusable identity exists for an eligible creation
- **WHEN** the backend creates the Firebase identity
- **THEN** its reservation was committed first and Firebase uses that exact reserved UID
- **AND** no local user, workspace, membership, GitHub ownership, or session is granted by the reservation alone

#### Scenario: Manual registration reservation preserves its original foundation
- **GIVEN** a valid manual registration request with display name, workspace name, and owner acknowledgement
- **WHEN** the backend commits its registration reservation before Firebase creation
- **THEN** it stores the exact reserved UID and original validated non-secret foundation payload
- **AND** it does not store the password or infer email consent

#### Scenario: Reservation binds atomically with the local account
- **GIVEN** Firebase creation succeeded for a reserved UID
- **WHEN** local account provisioning commits
- **THEN** its reservation transitions to bound in the same SQL transaction as local user and identity binding
- **AND** a failed local transaction leaves the creation proof available for a later authorized retry

#### Scenario: Unknown external creation outcome is reconciled
- **GIVEN** Firebase creation timed out or the process crashed before confirming success
- **WHEN** a later authorized attempt resumes
- **THEN** it reconciles the exact reserved UID and matching normalized email without reassigning the UID
- **AND** manual-registration recovery requires authenticated control of that exact UID without treating an unverified email as proof for cross-account adoption
- **AND** it refuses an incompatible identity or existing binding

#### Scenario: Manual recovery requires the exact reserved subject
- **GIVEN** a registration reservation survived a timeout, lost response, or process restart
- **WHEN** a later backend-verified Firebase authentication proves control of its exact reserved UID
- **THEN** the backend revalidates UID, email, disabled state, ownership, and reservation state before atomically completing or reusing the compatible original foundation
- **AND** a different UID with the same email, an unauthenticated retry, or the reservation alone cannot adopt it, mutate credentials, or grant a session

#### Scenario: Temporarily absent reserved UID remains unknown
- **GIVEN** a registration reservation survived a timeout or lost Firebase response
- **WHEN** reconciliation temporarily cannot find its exact reserved UID
- **THEN** the backend retains its immutable UID and registration-intent provenance because late creation may still finish
- **AND** it does not expire, delete, recreate, or hand the attempt to an unauthenticated retry based only on that observation

#### Scenario: Legacy identity does not acquire invented provenance
- **GIVEN** an existing Firebase identity has no local binding or application creation reservation
- **WHEN** its email matches a pending invitation or verified GitHub email
- **THEN** neither match is recorded as proof that GiTiempo created that identity
- **AND** adoption requires verified control through the existing identity authentication path

### Requirement: Additional Firebase Subjects Preserve Account Ownership
The system SHALL persist additional Firebase subjects only after verified provider authentication and safe account resolution. A subject MUST have one owner across canonical and additional bindings. Canonical JWT identity SHALL remain stable. Alternative-login safety MUST inspect live provider availability for proven subjects rather than infer credential linking from email or historical sign-in.

#### Scenario: Subject is bound with successful authentication
- **GIVEN** an unbound verified Google subject safely matches one local account by verified email
- **WHEN** login commits
- **THEN** its durable subject binding and session commit together without replacing the canonical UID
- **AND** failed authentication cannot leave a binding to another account

#### Scenario: Subject profile changes email
- **GIVEN** an additional subject already belongs to a local account
- **WHEN** that provider's profile email changes
- **THEN** subject ownership remains with the same account
- **AND** a conflicting other email owner causes safe rejection without rebinding

#### Scenario: Disconnect checks the actual alternative credential
- **GIVEN** Google authenticated an account through an additional Firebase subject
- **WHEN** GitHub disconnect checks for a usable alternative login
- **THEN** it checks the canonical and proven additional subjects against live Firebase availability
- **AND** a disabled or deleted identity or historical sign-in alone cannot authorize disconnect
