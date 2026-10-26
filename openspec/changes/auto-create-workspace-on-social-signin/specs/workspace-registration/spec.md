# Spec Delta

## MODIFIED Requirements

### Requirement: Public First Workspace Owner Registration
The system SHALL expose a public first-workspace-owner registration endpoint that creates a new workspace, creates the initial owner membership, and issues a normal API session without using invite acceptance.

#### Scenario: First owner registration succeeds
- **GIVEN** no existing account blocks the submitted work email
- **WHEN** a client submits a valid registration request to `POST /auth/register`
- **THEN** the system creates a Firebase email/password identity for the submitted work email
- **AND** creates a local user for that identity
- **AND** creates a new workspace with the submitted valid workspace name even when another workspace has the same name
- **AND** creates an active owner membership for the local user in that workspace
- **AND** returns the normal API token pair with owner workspace context

#### Scenario: Registration does not replace invite acceptance
- **GIVEN** a user needs access to an existing workspace
- **WHEN** the user is not the first owner creating a new workspace
- **THEN** the system requires the existing invite acceptance flow for membership creation
- **AND** registration does not create membership in an existing workspace

### Requirement: Registration Error Mapping
The registration endpoint MUST expose stable frontend-visible error cases for expected registration failures. Valid duplicate workspace names SHALL be accepted and MUST NOT produce a name-conflict error.

#### Scenario: Duplicate email is rejected
- **GIVEN** the submitted work email already belongs to an existing Firebase identity or local user
- **WHEN** registration is attempted
- **THEN** the system rejects the request as a duplicate email conflict
- **AND** no workspace or owner membership is created

#### Scenario: Workspace name is unavailable
- **GIVEN** the submitted valid workspace name was previously considered unavailable because it equals or normalizes to an existing workspace name
- **AND** all other registration conditions are satisfied
- **WHEN** registration is attempted
- **THEN** the system creates a separate workspace and owner membership successfully
- **AND** it does not return `workspace_name_unavailable`

#### Scenario: Registration is rate limited
- **GIVEN** registration attempts exceed the public endpoint throttle for a client
- **WHEN** another registration request is submitted
- **THEN** the system rejects the request as rate limited before creating Firebase or application records

#### Scenario: Registration service is unavailable
- **GIVEN** Firebase identity provisioning or application persistence cannot complete safely
- **WHEN** registration is attempted
- **THEN** the system rejects the request as registration service unavailable
- **AND** the response does not expose raw provider errors or secrets

### Requirement: Registration Partial Failure Handling
The system MUST prevent user-visible partial registration when first-owner registration fails. Firebase cleanup SHALL be coordinated with competing identity adoption and MUST NOT delete an identity already used by a committed local account.

#### Scenario: Application persistence fails after Firebase identity creation
- **GIVEN** Firebase identity creation succeeds
- **AND** application database registration cannot complete
- **WHEN** the registration workflow handles the failure
- **THEN** the system attempts to delete the newly created Firebase identity only while coordination prevents another flow from adopting it
- **AND** does not leave a workspace or owner membership available to the failed registration
- **AND** rejects the request as registration service unavailable

#### Scenario: Firebase cleanup fails after application persistence failure
- **GIVEN** Firebase identity creation succeeds
- **AND** application database registration cannot complete
- **AND** cleanup of the newly created Firebase identity also fails
- **WHEN** the registration workflow handles the failure
- **THEN** the system rejects the request as registration service unavailable
- **AND** the response keeps the stable `registration_service_unavailable` identifier in `code`
- **AND** the response does not expose raw provider failure details
- **AND** the backend emits an operational log for cleanup follow-up without logging the raw password

#### Scenario: Registration payload is redacted from logs
- **WHEN** the backend logs registration requests, validation failures, or provider failures
- **THEN** raw passwords and session credentials are redacted
- **AND** logs do not include raw bearer tokens, Firebase tokens, refresh tokens, or registration passwords

#### Scenario: Concurrent sign-in cannot lose an adopted identity
- **GIVEN** manual registration and social sign-in target the same Firebase identity
- **WHEN** registration fails and performs compensation
- **THEN** identity adoption and deletion are serialized
- **AND** an identity used by a committed local account is never deleted
- **AND** a social attempt whose verified identity was deleted before adoption fails safely instead of committing a dangling local user

