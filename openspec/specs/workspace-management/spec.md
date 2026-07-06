## Purpose

Define current workspace read and administration behavior for workspace identity, settings, and seeded workspace foundation.
## Requirements
### Requirement: Current Workspace Read

The system SHALL provide an authenticated current-workspace endpoint for the requester's active workspace membership context. The endpoint MUST return only the workspace bound to the current access-token workspace context and MUST NOT list alternate workspace memberships.

#### Scenario: Authenticated member reads current workspace

- **GIVEN** the requester has a valid access token and an active workspace membership
- **WHEN** the requester asks for the current workspace
- **THEN** the system returns the workspace identity and public workspace fields for that membership context
- **AND** the response does not include other workspaces the same user may belong to

#### Scenario: Current workspace changes after switch

- **GIVEN** an authenticated user switches to another workspace and receives a fresh access token for that workspace
- **WHEN** the requester asks for the current workspace with the fresh access token
- **THEN** the system returns the selected workspace identity
- **AND** the system does not return the previously active workspace

### Requirement: Workspace Settings Administration
The system MUST expose workspace settings to admins and restrict workspace-setting changes to admins. Workspace settings MUST include billing defaults and a workspace time zone used for calendar-period interpretation.

#### Scenario: Admin reads workspace settings
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for workspace settings
- **THEN** the system returns the workspace settings for that workspace
- **AND** the settings include `currency`, `defaultHourlyRate`, and `timeZone`

#### Scenario: Admin updates workspace settings
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid workspace-settings update
- **THEN** the system persists the new settings values and returns the updated settings

#### Scenario: Admin updates workspace time zone
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid IANA time-zone identifier in the workspace-settings update
- **THEN** the system persists the time-zone value and returns it in the updated settings

#### Scenario: Non-admin attempts to manage workspace settings
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to read or update workspace settings
- **THEN** the system rejects the request as forbidden

### Requirement: Workspace Identity Administration
The system MUST allow admins to update mutable workspace identity fields and prevent non-admin updates.

#### Scenario: Admin updates workspace name
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid workspace identity update
- **THEN** the system persists the updated workspace fields and returns the updated workspace

#### Scenario: Non-admin attempts to update workspace identity
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to update workspace identity
- **THEN** the system rejects the request as forbidden

### Requirement: Seeded Default Workspace Foundation

The system SHALL create the default workspace foundation during seed/bootstrap without preventing later creation of additional workspaces.

#### Scenario: Seed creates workspace and settings

- **GIVEN** the application is initialized in an empty environment
- **WHEN** seed data is applied
- **THEN** the system creates the default workspace and its workspace settings record
- **AND** the workspace settings use `UTC` as the default time zone

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

#### Scenario: Admin add validates organization membership beyond the initial owner list
- **GIVEN** the requester is an admin member of the current workspace with a connected GitHub account
- **AND** the requested organization login is not present in the first visible-owner result set
- **AND** a direct organization membership check or active membership listing confirms the requester can access the organization
- **WHEN** the requester adds the organization to the workspace policy
- **THEN** the system persists the organization login for the workspace
- **AND** the system returns the provider-confirmed organization login

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

#### Scenario: Admin removes an allowed GitHub organization by policy identifier
- **GIVEN** the requester is an admin member of the current workspace
- **AND** the workspace policy contains an allowed GitHub organization response with an identifier
- **WHEN** the requester removes that organization using the policy identifier
- **THEN** only that workspace policy row is removed
- **AND** same-login policy rows in other workspaces are not removed

#### Scenario: Non-admin cannot mutate allowed GitHub organizations
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to add or remove an allowed GitHub organization
- **THEN** the system rejects the request as forbidden
