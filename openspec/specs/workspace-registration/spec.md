# workspace-registration Specification

## Purpose
TBD - created by archiving change add-register-new-workflow-api-and-frontend. Update Purpose after archive.
## Requirements
### Requirement: Public First Workspace Owner Registration
The system SHALL expose a public first-workspace-owner registration endpoint that creates a new workspace, creates the initial owner membership, and issues a normal API session without using invite acceptance.

#### Scenario: First owner registration succeeds
- **GIVEN** no existing account blocks the submitted work email
- **AND** no existing workspace blocks the submitted workspace name
- **WHEN** a client submits a valid registration request to `POST /auth/register`
- **THEN** the system creates a Firebase email/password identity for the submitted work email
- **AND** creates a local user for that identity
- **AND** creates a new workspace with the submitted workspace name
- **AND** creates an active owner membership for the local user in that workspace
- **AND** returns the normal API token pair with owner workspace context

#### Scenario: Registration does not replace invite acceptance
- **GIVEN** a user needs access to an existing workspace
- **WHEN** the user is not the first owner creating a new workspace
- **THEN** the system requires the existing invite acceptance flow for membership creation
- **AND** registration does not create membership in an existing workspace

### Requirement: Registration Request Validation
Registration requests MUST validate all contract-facing input before creating Firebase or application records.

#### Scenario: Required registration fields
- **WHEN** a registration request is validated
- **THEN** the payload requires `email`, `fullName`, `workspaceName`, `password`, and `ownerAcknowledgement`
- **AND** `ownerAcknowledgement` must be `true`
- **AND** unknown additional fields are rejected

#### Scenario: Invalid registration input is rejected
- **GIVEN** a registration request contains an invalid email, blank full name, blank workspace name, weak password, or missing owner acknowledgement
- **WHEN** the endpoint validates the payload
- **THEN** the system rejects the request as invalid without creating Firebase or application records

### Requirement: Registration Error Mapping
The registration endpoint MUST expose stable frontend-visible error cases for expected registration failures.

#### Scenario: Duplicate email is rejected
- **GIVEN** the submitted work email already belongs to an existing Firebase identity or local user
- **WHEN** registration is attempted
- **THEN** the system rejects the request as a duplicate email conflict
- **AND** no workspace or owner membership is created

#### Scenario: Workspace name is unavailable
- **GIVEN** the submitted workspace name is unavailable according to the workspace uniqueness rule
- **WHEN** registration is attempted
- **THEN** the system rejects the request as a workspace-name conflict
- **AND** no owner membership is created

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
The system MUST prevent user-visible partial registration when one step of first-owner registration fails.

#### Scenario: Application persistence fails after Firebase identity creation
- **GIVEN** Firebase identity creation succeeds
- **AND** application database registration cannot complete
- **WHEN** the registration workflow handles the failure
- **THEN** the system attempts to delete the newly created Firebase identity
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

