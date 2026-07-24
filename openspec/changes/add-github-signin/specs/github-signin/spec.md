## ADDED Requirements

### Requirement: GitHub Is A Firebase Sign-In Method

GiTiempo web frontends MUST offer GitHub as a Firebase Auth sign-in method through a shared `signInWithGitHub()` runtime that requests only the `user:email` scope, and MUST exchange the resulting Firebase ID token through the existing app login endpoint without any GitHub-specific backend path.

#### Scenario: Continue with GitHub is offered on login

- **WHEN** a guest opens the user-web or admin-web login page
- **THEN** the page shows a **Continue with GitHub** action alongside the existing sign-in methods
- **AND** activating it starts Firebase GitHub sign-in requesting only the `user:email` scope

#### Scenario: GitHub sign-in yields a normal session

- **WHEN** a member completes Firebase GitHub sign-in and the Firebase account is linked to their identity
- **THEN** the frontend exchanges the Firebase ID token through the existing `POST /auth/login`
- **AND** the member obtains a normal access and refresh session with their existing Firebase UID and active-membership access
- **AND** no GitHub-specific backend endpoint or database migration is involved

#### Scenario: Sign-in scope stays identity-only

- **WHEN** GitHub sign-in requests authorization
- **THEN** it requests only the `user:email` scope
- **AND** it does not request repository or organization permissions

### Requirement: GitHub Sign-In Recovers From Existing-Account Conflicts

The shared auth runtime MUST recover from Firebase `auth/account-exists-with-different-credential` by authenticating with the email's existing sign-in method and linking the pending GitHub credential, so the member keeps a single Firebase UID.

#### Scenario: Email already registered with a different provider

- **GIVEN** GitHub sign-in returns `auth/account-exists-with-different-credential` because the email already has a different sign-in method
- **WHEN** the runtime handles the error
- **THEN** it authenticates the member with the existing method for that email
- **AND** it links the pending GitHub credential to that Firebase account
- **AND** the member retains their existing Firebase UID with no duplicate identity created

#### Scenario: Linking recovery cannot complete

- **GIVEN** the existing-account recovery is in progress
- **WHEN** the member cancels or the existing-method authentication fails
- **THEN** the frontend returns to a guest state without partial session tokens
- **AND** it surfaces retryable guidance without creating a duplicate Firebase identity

### Requirement: GitHub Sign-In Stays Independent Of The GitHub App Integration

GitHub sign-in MUST remain independent of the GitHub App integration and `github_connections` token storage, and the backend MUST continue to resolve sessions by Firebase UID rather than by email.

#### Scenario: Sign-in does not create an integration connection

- **WHEN** a member signs in with GitHub
- **THEN** no GitHub integration connection is created
- **AND** no GitHub OAuth token obtained for sign-in is persisted as an integration token in `github_connections`

#### Scenario: Backend does not merge local users by email

- **WHEN** a GitHub-authenticated Firebase identity exchanges its token at the login endpoint
- **THEN** the backend resolves the session by Firebase UID as it does for other providers
- **AND** the backend does not match or merge local users by email
