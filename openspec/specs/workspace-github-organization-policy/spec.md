# workspace-github-organization-policy Specification

## Purpose
Define the workspace-owned GitHub organization allow-list that filters organization-scoped GitHub browsing and selection flows without changing the existing user-to-server GitHub authentication model.
## Requirements
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

Workspace organization setup SHALL require the current user's OAuth organization-discovery capability, independent of personal GitHub App authorization. Existing workspace policy SHALL remain visible under workspace permissions while personal authorization is unavailable.

#### Scenario: OAuth readiness exposes setup
- **GIVEN** an admin has OAuth read:org access and workspace policy loaded successfully
- **WHEN** organization setup is displayed
- **THEN** Add organization SHALL be available under existing workspace permissions even without a personal App grant or installation

#### Scenario: Missing OAuth permission offers recovery
- **GIVEN** an admin is linked but lacks usable OAuth read:org access
- **WHEN** organization setup is displayed
- **THEN** the UI SHALL explain the required authorization and offer recovery
- **AND** it MUST NOT submit an organization addition until the prerequisite is met

#### Scenario: Unknown connection status blocks setup
- **GIVEN** connection status is loading or failed
- **WHEN** organization setup is displayed
- **THEN** Add organization MUST NOT submit requests
- **AND** saved policy and independently loaded workspace settings SHALL remain visible

#### Scenario: Disconnected policy management
- **GIVEN** an admin has no active personal link
- **WHEN** saved workspace policy is loaded
- **THEN** existing organizations SHALL remain visible and removable under workspace authorization
- **AND** adding SHALL require OAuth linking first

### Requirement: Adding Workspace GitHub Organizations Requires Connected Admin Account

Adding a workspace GitHub organization SHALL require workspace admin authority and usable OAuth read:org membership access. The server SHALL validate active membership through that admin's OAuth account before saving the workspace-owned row. Missing App installation alone MUST NOT reject addition. Existing normalization, duplicate prevention and reference reconciliation SHALL remain in force.

#### Scenario: OAuth membership validates addition before installation
- **GIVEN** a workspace admin has OAuth-visible active membership in an organization with no GiTiempo App installation
- **WHEN** the admin adds that organization
- **THEN** the server SHALL validate membership with OAuth and save the policy row
- **AND** it MUST NOT require App installation, auto-install an App, or authorize browsing/tracking by saving the row

#### Scenario: Missing OAuth prevents writes
- **GIVEN** an admin lacks usable OAuth authorization or effective read:org
- **WHEN** the admin requests an addition
- **THEN** the server SHALL reject without writing policy and return safe authorization recovery guidance
- **AND** it MUST NOT call GitHub with missing or invalid token material

#### Scenario: Provider membership or policy denies addition
- **GIVEN** OAuth cannot verify active membership or GitHub restricts access
- **WHEN** an admin requests an addition
- **THEN** the server MUST reject without saving a row
- **AND** it SHALL distinguish membership, OAuth permission/policy and transient provider failures without exposing secrets

#### Scenario: Read and removal need no personal connection
- **GIVEN** an authenticated admin has no personal GitHub connection
- **WHEN** the admin reads or removes existing policy
- **THEN** the operation SHALL use existing workspace authorization without requiring GitHub provider access

#### Scenario: Policy remains a filter
- **GIVEN** an organization has been added using OAuth
- **WHEN** another member browses its data or starts an installation-backed timer
- **THEN** each operation SHALL still enforce its existing provider credentials and workspace authorization
- **AND** OAuth membership discovery MUST NOT replace installation verification
