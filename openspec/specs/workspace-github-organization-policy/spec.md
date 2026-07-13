# workspace-github-organization-policy Specification

## Purpose
Define the workspace-owned GitHub organization allow-list that filters organization-scoped GitHub browsing and selection flows without changing the existing user-to-server GitHub authentication model.
## Requirements
### Requirement: Workspace GitHub Organization Policy Exists
The system SHALL maintain a workspace-owned allow-list of GitHub organization logins that defines which GitHub organizations can be used in workspace GitHub flows.

#### Scenario: Workspace has allowed GitHub organizations
- **GIVEN** a workspace has saved GitHub organization policy records
- **WHEN** the system reads the workspace GitHub organization policy
- **THEN** it returns the allowed organization logins for that workspace
- **AND** it does not return policy records from another workspace

#### Scenario: Empty policy allows no organizations
- **GIVEN** a workspace has no saved GitHub organization policy records
- **WHEN** the system evaluates organization-scoped GitHub access for that workspace
- **THEN** no GitHub organization is treated as allowed
- **AND** personal GitHub account scope is not disabled by the empty organization policy

#### Scenario: Allowing an organization reconciles existing GitHub-backed workspace refs
- **GIVEN** the workspace already contains GitHub-backed local project or task refs for repositories in an organization being allowed
- **WHEN** an admin adds that organization to the workspace policy
- **THEN** the system verifies those existing refs do not map the same normalized repository or issue to different local records
- **AND** the system backfills canonical organization-login GitHub refs for the existing local records when they are unambiguous

#### Scenario: Removing an organization preserves historical GitHub-backed workspace refs
- **GIVEN** the workspace already contains GitHub-backed local project or task refs for repositories in an organization
- **AND** that organization is removed from the workspace policy
- **WHEN** users view existing local GiTiempo project, task, or time history that already references those GitHub refs
- **THEN** the system does not delete the local records or erase their existing external refs
- **AND** the removed organization remains unavailable for new GitHub browsing, task-picker, or selection flows

### Requirement: GitHub Organization Policy Is A Filter Only
The system MUST treat the workspace GitHub organization allow-list as a GiTiempo visibility policy layered on top of each user's connected GitHub account permissions.

#### Scenario: Allowed organization does not grant provider access
- **GIVEN** a GitHub organization login is allowed for the workspace
- **AND** a workspace member's connected GitHub account cannot access that organization
- **WHEN** the member requests GitHub data for that organization
- **THEN** the system does not grant access through the workspace policy
- **AND** the response reflects the member's provider access failure or empty provider result safely

#### Scenario: Disallowed organization remains hidden
- **GIVEN** a workspace member's connected GitHub account can access a GitHub organization
- **AND** that organization is not allowed by the workspace policy
- **WHEN** the member requests GitHub data for that organization
- **THEN** the system rejects the organization-scoped request or omits that organization from selectable results

### Requirement: Organization Logins Are Normalized For Policy Matching
The system SHALL compare GitHub organization logins case-insensitively while preserving a display login in responses.

#### Scenario: Duplicate login casing is prevented
- **GIVEN** a workspace already allows GitHub organization login `Octo-Org`
- **WHEN** an admin attempts to add `octo-org` for the same workspace
- **THEN** the system prevents a duplicate policy record
- **AND** the existing allowed organization remains available in policy responses

#### Scenario: Policy matching ignores case
- **GIVEN** a workspace allows GitHub organization login `Octo-Org`
- **WHEN** a GitHub browsing request targets owner `octo-org`
- **THEN** the system treats the owner as allowed for that workspace

### Requirement: Workspace GitHub Organization Setup Requires Connected User Account

The system SHALL expose workspace GitHub organization setup actions only when the current user has a connected GitHub account, while continuing to show existing workspace organization policy state when it can be loaded.

#### Scenario: Add organization is hidden before GitHub account connection

- **GIVEN** the current user has no connected GitHub account
- **WHEN** the user opens workspace GitHub organization policy management
- **THEN** the `Add organization` setup action is not exposed
- **AND** the user is told that a connected GitHub account is required before adding organizations

#### Scenario: Add organization is hidden when connection status cannot be confirmed

- **WHEN** the current user's GitHub connection status is loading or failed to load
- **THEN** workspace GitHub organization policy management does not expose the `Add organization` setup action
- **AND** no organization add request is sent from that setup UI state

#### Scenario: Existing policy remains visible while disconnected

- **GIVEN** the current user's GitHub account is disconnected
- **AND** the workspace has saved GitHub organization policy records
- **WHEN** the user opens workspace GitHub organization policy management and policy data loads successfully
- **THEN** the saved allowed organization logins remain visible
- **AND** supported non-add management actions remain governed by the workspace policy response and the user's existing workspace permissions

#### Scenario: Connected user can start organization setup

- **GIVEN** the current user has a connected GitHub account
- **AND** workspace GitHub organization policy data has loaded successfully
- **WHEN** the user opens workspace GitHub organization policy management
- **THEN** the `Add organization` setup action is exposed according to the existing workspace policy management rules
- **AND** submitted organization additions continue to be validated by the backend against the user's GitHub provider access and workspace policy constraints

### Requirement: Adding Workspace GitHub Organizations Requires Connected Admin Account

The system MUST require the requesting admin to have a usable connected GitHub account before adding a GitHub organization to the workspace allow-list, while keeping the policy itself workspace-owned.

#### Scenario: Disconnected admin cannot add organization policy

- **GIVEN** an authenticated admin has no usable connected GitHub account
- **WHEN** the admin requests to add a GitHub organization to the current workspace policy
- **THEN** the system MUST reject the request without saving a policy row
- **AND** it MUST NOT call GitHub provider APIs with missing or invalid token material
- **AND** the response MUST NOT expose GitHub access tokens, refresh tokens, or token secrets

#### Scenario: Connected admin adds organization through own provider access

- **GIVEN** an authenticated admin has a usable connected GitHub account
- **WHEN** the admin requests to add a GitHub organization to the current workspace policy
- **THEN** the system SHALL validate the organization through that admin's connected GitHub account before saving the policy row
- **AND** the saved policy row remains owned by the workspace rather than by the admin's GitHub token
- **AND** other workspace members still only see organization data their own connected GitHub accounts can access

#### Scenario: Reading policy does not require connected GitHub account

- **GIVEN** an authenticated admin has no usable connected GitHub account
- **WHEN** the admin requests the current workspace GitHub organization policy
- **THEN** the system SHALL return the workspace policy rows the admin is authorized to manage
- **AND** it SHALL NOT require a GitHub provider call just to read saved policy rows

#### Scenario: Removing policy does not require connected GitHub account

- **GIVEN** an authenticated admin has no usable connected GitHub account
- **AND** the current workspace has a saved GitHub organization policy row
- **WHEN** the admin removes that policy row
- **THEN** the system SHALL remove the row using workspace authorization
- **AND** it SHALL NOT require a GitHub provider call just to remove the saved policy row

#### Scenario: Recoverable add failures return safe recovery details

- **GIVEN** an authenticated admin has a connected GitHub account
- **AND** GitHub reports that the requested organization is unavailable, blocked, suspended, missing app installation, or otherwise not visible to that account
- **WHEN** the admin requests to add that organization to the current workspace policy
- **THEN** the system MUST reject the request without saving a policy row
- **AND** the response SHALL include a stable recovery reason and ordered recovery steps when the failure is recoverable
- **AND** the response MUST NOT expose GitHub token material or raw provider secrets
