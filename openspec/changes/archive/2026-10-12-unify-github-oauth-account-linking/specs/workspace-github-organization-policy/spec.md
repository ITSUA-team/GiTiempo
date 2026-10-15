## MODIFIED Requirements

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
