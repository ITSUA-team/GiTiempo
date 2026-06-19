## ADDED Requirements

### Requirement: Workspace GitHub Organization Policy Administration
The system MUST expose workspace GitHub organization allow-list management to workspace admins and reject non-admin management attempts.

#### Scenario: Admin lists allowed GitHub organizations
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for the workspace GitHub organization allow-list
- **THEN** the system returns the allowed organizations for that workspace

#### Scenario: Non-admin cannot list allowed GitHub organizations
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester asks for the workspace GitHub organization allow-list
- **THEN** the system rejects the request as forbidden

#### Scenario: Admin adds an allowed GitHub organization
- **GIVEN** the requester is an admin member of the current workspace with a connected GitHub account
- **AND** the requested organization login is visible to that admin's connected GitHub account
- **WHEN** the requester adds the organization to the workspace policy
- **THEN** the system persists the organization login for the workspace
- **AND** the system returns the saved allowed organization

#### Scenario: Admin add validates through GitHub connection
- **GIVEN** the requester is an admin member of the current workspace
- **AND** the requester has no usable connected GitHub account
- **WHEN** the requester attempts to add an allowed GitHub organization
- **THEN** the system rejects the request without saving a policy record

#### Scenario: Admin cannot add inaccessible organization
- **GIVEN** the requester is an admin member of the current workspace with a connected GitHub account
- **AND** the requested organization login is not visible to that admin's connected GitHub account
- **WHEN** the requester attempts to add the organization to the workspace policy
- **THEN** the system rejects the request without saving a policy record

#### Scenario: Admin add returns safe recovery reason for GitHub-side access failures
- **GIVEN** the requester is an admin member of the current workspace
- **AND** the requester attempts to add a GitHub organization that cannot currently be validated because the requester has no connected GitHub account, the organization is not visible, the GitHub App is blocked or needs approval for the organization, or GitHub returns a retryable provider failure
- **WHEN** the system rejects the add request
- **THEN** the system does not save a policy record
- **AND** the rejection includes a stable frontend-safe reason code for the recovery category
- **AND** the rejection includes a structured GitHub App access recovery payload with ordered step ids and backend-derived status values
- **AND** the rejection does not expose GitHub token material or raw provider secrets

#### Scenario: Admin removes an allowed GitHub organization
- **GIVEN** the requester is an admin member of the current workspace
- **AND** the workspace policy contains an allowed GitHub organization
- **WHEN** the requester removes that organization login from the policy
- **THEN** the organization is no longer allowed for new workspace GitHub flows

#### Scenario: Non-admin cannot mutate allowed GitHub organizations
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to add or remove an allowed GitHub organization
- **THEN** the system rejects the request as forbidden
