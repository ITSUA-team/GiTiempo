## ADDED Requirements

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
