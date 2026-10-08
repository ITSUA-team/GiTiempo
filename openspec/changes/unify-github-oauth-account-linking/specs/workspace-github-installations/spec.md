## MODIFIED Requirements

### Requirement: Installation Links Require Verified Administrator Authority
The system SHALL allow only an active GiTiempo workspace admin to link an organization installation of the configured GitHub App. Before activating the link, the backend MUST verify the installation's App identity and stable organization account identity, the requesting admin's access to that exact installation, and their active organization-owner authority through GitHub. A submitted installation identifier, callback query, or existing organization allow-list entry MUST NOT establish authority by itself. Interactive setup state MUST be single-use, expiring, and bound to the initiating GiTiempo user, workspace, and organization.

#### Scenario: Authorized owner links an installation
- **GIVEN** an active workspace admin has a usable personal GitHub App credential for the linked identity and is an active owner of the selected allowed GitHub organization
- **WHEN** the backend verifies their access to the exact active installation and its App and organization identities
- **THEN** it saves a verified installation association for that workspace and organization
- **AND** it stores no personal access token as a workspace credential

#### Scenario: Installation identifier does not prove ownership
- **GIVEN** an admin submits a valid installation ID but is not an active owner of its organization or cannot access that installation
- **WHEN** setup verification runs
- **THEN** the backend rejects the link without creating or replacing a verified association

#### Scenario: Wrong installation or callback context is rejected
- **GIVEN** a setup attempt supplies another App's installation, a personal-account installation, a different organization, an expired or consumed state, or a state bound to another user or workspace
- **WHEN** setup is completed
- **THEN** no verified link is activated
- **AND** the backend returns a safe setup failure

#### Scenario: Admin authority is rechecked at completion
- **GIVEN** the initiator loses active workspace admin membership after beginning setup
- **WHEN** the callback or link completion is processed
- **THEN** the backend refuses the link even if GitHub verification otherwise succeeds

#### Scenario: OAuth identity alone is insufficient for installation setup
- **GIVEN** an admin has OAuth identity and organization membership but no usable personal App credential
- **WHEN** installation verification is attempted
- **THEN** the system MUST require personal App authorization for the same identity
- **AND** it MUST retain exact-installation visibility, owner, App identity, organization and permission checks

### Requirement: Settings Automatically Confirms Existing App Installations
Admin Settings SHALL retain the existing GitHub Workspace Access organization-policy UI: one allowed-organization row with its login, `Allowed for this workspace`, and `Remove`. It SHALL additionally offer `Install App` beside `Remove` under the explicit setup conditions below, without installation status labels, association-only rows, or a separate installations card. After loading allowed organizations and after successfully adding one, an eligible workspace administrator with a usable personal GitHub App grant SHALL automatically attempt setup only for organizations with no saved installation association. The automatic flow MUST complete the same state, owner, installation visibility, App, organization, and permission checks as explicit setup. Tracking members MUST NOT be prompted to establish a personal GitHub connection.

#### Scenario: Existing GitHub App is confirmed automatically
- **GIVEN** an allowed organization has no saved association but already has the configured GitHub App installed
- **AND** the current workspace administrator has a usable personal GitHub App credential for the linked identity and active organization-owner authority
- **WHEN** Admin Settings loads the allowed organizations or successfully adds that organization
- **THEN** the backend discovers the installation using App authentication and returns its candidate ID with single-use setup state
- **AND** the client completes the same full owner, installation visibility, App, organization, and permission verification without asking the user to reinstall
- **AND** the existing Workspace Access row remains a policy row

#### Scenario: Missing App installation does not trigger automatic navigation
- **GIVEN** an eligible allowed organization has no saved association
- **WHEN** App-authenticated discovery returns GitHub 404
- **THEN** GiTiempo does not redirect to GitHub automatically
- **AND** the administrator can explicitly use the row's `Install App` action
- **AND** it leaves the association absent and the allowed-organization policy unchanged

#### Scenario: Existing association is preserved
- **GIVEN** an organization already has a verified, suspended, unavailable, or locally disconnected saved association
- **WHEN** Admin Settings loads the allowed organizations or adds another organization
- **THEN** it does not automatically reverify or reactivate that association
- **AND** the row retains its policy information and offers `Install App` only when the saved association is not verified

#### Scenario: Admin cannot prove setup authority
- **GIVEN** an allowed organization has no saved association
- **AND** the current workspace admin has no usable personal GitHub App credential for the linked identity or is not an active organization owner
- **WHEN** Admin Settings loads or adds the organization
- **THEN** GiTiempo does not persist an association
- **AND** it leaves the Workspace Access policy UI unchanged

#### Scenario: OAuth organization addition survives unavailable App setup
- **GIVEN** an OAuth-authorized admin adds an organization but has no usable personal App grant
- **WHEN** the policy addition completes and Settings considers automatic confirmation
- **THEN** the policy addition SHALL remain successful and saved
- **AND** automatic installation confirmation SHALL be skipped until the App credential prerequisite is met
- **AND** the UI MUST NOT revert the row or present App setup as a failure of OAuth organization discovery

### Requirement: Settings Offers Explicit Installation Setup
Admin Settings SHALL show `Install App` beside `Remove` only after installation status has loaded successfully and the allowed organization has no `verified` association. The action SHALL be available for absent, suspended, unavailable, and locally disconnected associations. It MUST use authenticated setup and completion with full authority verification. Clicking the action MUST NOT itself mark an installation verified or imply that the App is absent on GitHub. A pending manual setup SHALL show loading on its row and disable other `Install App` clicks.

#### Scenario: Status is unknown or already verified
- **GIVEN** installation status has not loaded successfully or the organization has a verified association
- **WHEN** Settings renders the organization row
- **THEN** it hides `Install App`

#### Scenario: Explicit setup reuses an existing installation
- **GIVEN** an eligible organization owner with a usable personal GitHub App grant clicks `Install App`
- **WHEN** authenticated setup returns an existing installation candidate
- **THEN** the client completes full verification without navigating to GitHub or requesting reinstallation
- **AND** successful completion refreshes status and hides the action
- **AND** a saved non-verified association can be restored only after successful verification following this explicit action

#### Scenario: Explicit setup opens GitHub when no installation is found
- **GIVEN** an eligible organization owner with a usable personal GitHub App grant clicks `Install App`
- **WHEN** setup succeeds without an existing installation candidate after GitHub returns 404
- **THEN** the client navigates in the current tab to the configured App installation URL containing the opaque setup state
- **AND** the administrator selects the intended organization on GitHub
- **AND** a callback for a personal account or another organization cannot establish the requested workspace link

#### Scenario: Setup cannot proceed
- **GIVEN** the administrator lacks a usable personal GitHub App credential for the linked identity or setup fails an authority, configuration, or discovery check
- **WHEN** they click `Install App`
- **THEN** Settings reports the failure without navigating to GitHub or activating an association

#### Scenario: OAuth-only admin receives targeted App recovery
- **GIVEN** the admin can manage organization policy through OAuth but lacks personal App authorization
- **WHEN** the admin attempts explicit installation setup
- **THEN** the UI SHALL offer personal App authorization recovery and preserve organization policy
- **AND** it MUST NOT request another OAuth identity connection as a substitute
