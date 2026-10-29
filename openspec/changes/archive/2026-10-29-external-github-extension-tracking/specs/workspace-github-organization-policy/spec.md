## MODIFIED Requirements

### Requirement: Workspace GitHub Organization Policy Exists
The system SHALL maintain a workspace-owned allow-list of GitHub organization logins that defines which GitHub organizations can be used in provider-backed workspace GitHub flows.
 External reference recording SHALL not require organization approval or modify the allow-list. This exception MUST NOT broaden provider-backed browsing, import, or installation authorization.

#### Scenario: Workspace has allowed GitHub organizations
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** a workspace has saved GitHub organization policy records
- **WHEN** the system reads the workspace GitHub organization policy
- **THEN** it returns the allowed organization logins for that workspace
- **AND** it does not return policy records from another workspace


#### Scenario: Empty policy allows no organizations
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** a workspace has no saved GitHub organization policy records
- **WHEN** the system evaluates organization-scoped GitHub access for that workspace
- **THEN** no GitHub organization is treated as allowed
- **AND** personal GitHub account scope is not disabled by the empty organization policy


#### Scenario: Allowing an organization reconciles existing GitHub-backed workspace refs
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** the workspace already contains GitHub-backed local project or task refs for repositories in an organization being allowed
- **WHEN** an admin adds that organization to the workspace policy
- **THEN** the system verifies those existing refs do not map the same normalized repository or issue to different local records
- **AND** the system backfills canonical organization-login GitHub refs for the existing local records when they are unambiguous


#### Scenario: Removing an organization preserves historical GitHub-backed workspace refs
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** the workspace already contains GitHub-backed local project or task refs for repositories in an organization
- **AND** that organization is removed from the workspace policy
- **WHEN** users view existing local GiTiempo project, task, or time history that already references those GitHub refs
- **THEN** the system does not delete the local records or erase their existing external refs
- **AND** the removed organization remains unavailable for new GitHub browsing, task-picker, or selection flows

#### Scenario: Unlisted customer can be tracked by reference
- **GIVEN** a customer organization is absent from workspace policy
- **WHEN** an active member starts an otherwise valid external issue reference
- **THEN** the reference start is permitted without adding the organization or broadening browsing/import access


### Requirement: GitHub Organization Policy Is A Filter Only
The system MUST treat the workspace GitHub organization allow-list as a GiTiempo visibility policy layered on top of the provider credential used by each operation: the user's connected account for existing browsing/import flows, and the workspace's verified installation for installation-authorized GitHub timer starts. An allow-list entry MUST NOT establish installation access or project tracking authorization.
 External reference recording SHALL not require organization approval or modify the allow-list. This exception MUST NOT broaden provider-backed browsing, import, or installation authorization.

#### Scenario: Allowed organization does not grant provider access
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** a GitHub organization login is allowed for the workspace
- **AND** a workspace member's connected GitHub account cannot access that organization
- **WHEN** the member requests GitHub data for that organization
- **THEN** the system does not grant access through the workspace policy
- **AND** the response reflects the member's provider access failure or empty provider result safely


#### Scenario: Disallowed organization remains hidden
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** a workspace member's connected GitHub account can access a GitHub organization
- **AND** that organization is not allowed by the workspace policy
- **WHEN** the member requests GitHub data for that organization
- **THEN** the system rejects the organization-scoped request or omits that organization from selectable results


#### Scenario: Installation tracking is independent of the member's personal account
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** an allowed organization with a verified workspace installation and an assigned active member with no personal GitHub connection
- **WHEN** the member starts tracking an accessible issue in the mapped active project
- **THEN** organization policy is applied to installation access and does not require that member's GitHub OAuth


#### Scenario: Removing organization policy blocks installation starts
- **GIVEN** the operation uses provider-backed browsing, import or installation tracking
- **AND** an installation is still active in GitHub but its organization is removed from workspace policy
- **WHEN** a new GitHub start is requested
- **THEN** it is rejected without tracking writes
- **AND** historical records and owned timer stop remain available under existing GiTiempo rules

#### Scenario: Unlisted customer can be tracked by reference
- **GIVEN** a customer organization is absent from workspace policy
- **WHEN** an active member starts an otherwise valid external issue reference
- **THEN** the reference start is permitted without adding the organization or broadening browsing/import access
