# workspace-github-organization-policy Specification

## Purpose
TBD - created by archiving change add-workspace-github-organization-allow-list-management. Update Purpose after archive.
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

