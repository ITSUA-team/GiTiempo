## MODIFIED Requirements

### Requirement: GitHub Organization Policy Is A Filter Only
The system MUST treat the workspace GitHub organization allow-list as a GiTiempo visibility policy layered on top of the provider credential used by each operation: the user's connected account for existing browsing/import flows, and the workspace's verified installation for GitHub timer starts. An allow-list entry MUST NOT establish installation access or project tracking authorization.

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

#### Scenario: Installation tracking is independent of the member's personal account
- **GIVEN** an allowed organization with a verified workspace installation and an assigned active member with no personal GitHub connection
- **WHEN** the member starts tracking an accessible issue in the mapped active project
- **THEN** organization policy is applied to installation access and does not require that member's GitHub OAuth

#### Scenario: Removing organization policy blocks installation starts
- **GIVEN** an installation is still active in GitHub but its organization is removed from workspace policy
- **WHEN** a new GitHub start is requested
- **THEN** it is rejected without tracking writes
- **AND** historical records and owned timer stop remain available under existing GiTiempo rules


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
- **AND** browsing and import still use each member's own provider access; installation-based timer access separately requires a verified installation link and GiTiempo tracking authorization

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
