## MODIFIED Requirements

### Requirement: Installation Links Require Verified Workspace and GitHub App Authority
The system SHALL allow only an active GiTiempo workspace admin to link an organization installation of the configured GitHub App to an organization allowed in that workspace. Setup MUST use the admin's OAuth `read:org` grant to resolve and bind the selected active organization membership to its stable GitHub organization ID. The backend MUST verify the configured App identity, installation ID, organization ID and login, active installation status, required permissions, and ability to mint the restricted installation token. It MUST NOT require personal GitHub App authorization, membership in `/user/installations`, or organization-owner/admin role. Interactive setup state MUST be single-use, expiring, and bound to the initiating GiTiempo user, workspace, and organization. A submitted installation identifier or callback query MUST NOT establish authority by itself.

#### Scenario: OAuth-connected workspace admin links an installation
- **GIVEN** an active workspace admin has OAuth `read:org` access and active membership in the selected allowed GitHub organization
- **AND** the configured GitHub App has an active installation on that organization with the required permissions
- **WHEN** the backend verifies the exact installation through GitHub App authentication
- **THEN** it saves a verified installation association for that workspace and organization
- **AND** it stores no personal access token as a workspace credential
- **AND** no personal GitHub App authorization or organization-owner role is required

#### Scenario: GitHub controls permission to install the App
- **GIVEN** an active workspace admin has OAuth `read:org` access and selects an allowed organization where the configured App is not installed
- **WHEN** the admin explicitly starts setup and continues to GitHub's App installation page
- **THEN** GitHub determines whether that GitHub account may install the App on the selected organization
- **AND** GiTiempo accepts completion only for the App installation and organization bound to the setup state
- **AND** a denied or cancelled GitHub installation does not create or replace an association

#### Scenario: Wrong installation or callback context is rejected
- **GIVEN** a setup attempt supplies another App's installation, a personal-account installation, a different organization, an expired or consumed state, or a state bound to another user or workspace
- **WHEN** setup is completed
- **THEN** no verified link is activated
- **AND** the backend returns a safe setup failure

#### Scenario: Admin authority is rechecked at completion
- **GIVEN** the initiator loses active GiTiempo workspace admin membership after beginning setup
- **WHEN** the callback or link completion is processed
- **THEN** the backend refuses the link even if GitHub verification otherwise succeeds

#### Scenario: Personal GitHub App authorization is absent
- **GIVEN** an admin has OAuth `read:org` access and active membership in the selected organization but no personal GitHub App authorization
- **WHEN** installation setup or re-verification runs
- **THEN** setup and verification continue using GitHub App installation authentication
- **AND** private repository/project browsing and import remain unavailable until personal GitHub App authorization is granted

### Requirement: Settings Automatically Confirms Existing App Installations
Admin Settings SHALL retain the existing GitHub Workspace Access organization-policy UI: one allowed-organization row with its login, `Allowed for this workspace`, and `Remove`. It SHALL offer `Install App` beside `Remove` only after automatic reconciliation confirms there is no verified installation, without installation status labels, association-only rows, or a separate installations card. After loading allowed organizations and after successfully adding one, an eligible workspace administrator SHALL automatically reconcile every allowed organization with the saved installation state. Verified associations are re-verified using App authentication; absent, suspended, or unavailable associations are discovered through setup using OAuth `read:org`; locally disconnected associations are preserved. The automatic flow MUST complete the same App, organization, permission, and installation-token checks as explicit setup. Tracking members MUST NOT be prompted to establish a personal GitHub connection.

#### Scenario: Existing GitHub App is confirmed automatically
- **GIVEN** an allowed organization has no saved association but already has the configured GitHub App installed
- **AND** the current workspace administrator has OAuth `read:org` access and active membership in that organization
- **WHEN** Admin Settings loads the allowed organizations or successfully adds that organization
- **THEN** the backend discovers the installation using App authentication and returns its candidate ID with single-use setup state
- **AND** the client completes exact App, organization, permission, and installation-token verification without asking the user to reinstall
- **AND** the existing Workspace Access row remains a policy row

#### Scenario: Missing App installation does not trigger automatic navigation
- **GIVEN** an eligible allowed organization has no saved association
- **WHEN** App-authenticated discovery returns GitHub 404
- **THEN** GiTiempo does not redirect to GitHub automatically
- **AND** the administrator can explicitly use the row's `Install App` action
- **AND** it leaves the association absent and the allowed-organization policy unchanged

#### Scenario: Saved installation state is reconciled on Settings load
- **GIVEN** an organization has a saved verified, suspended, unavailable, or locally disconnected association
- **WHEN** Admin Settings loads the allowed organizations
- **THEN** it re-verifies verified associations and rediscovers suspended or unavailable associations
- **AND** it preserves locally disconnected associations
- **AND** it retains the policy row and offers `Install App` only after reconciliation confirms that no verified installation exists

#### Scenario: Settings load detects an installation removed directly in GitHub
- **GIVEN** an allowed organization has a stale verified association because the App was removed directly in GitHub
- **WHEN** Admin Settings opens
- **THEN** GiTiempo verifies the installation with GitHub App authentication
- **AND** if GitHub confirms the installation is missing, GiTiempo marks the stale association unavailable and offers `Install App`
- **AND** a transient GitHub verification failure does not mark the association unavailable

#### Scenario: Organization policy survives setup unavailability
- **GIVEN** an OAuth-authorized admin adds an organization but OAuth or GitHub App setup is temporarily unavailable
- **WHEN** the policy addition completes and Settings considers automatic confirmation
- **THEN** the policy addition SHALL remain successful and saved
- **AND** automatic installation confirmation SHALL not turn an unavailable setup into a policy failure

### Requirement: Settings Offers Explicit Installation Setup
Admin Settings SHALL show `Install App` beside `Remove` only after installation status has loaded successfully and the allowed organization has no `verified` association. The action SHALL be available for absent, suspended, unavailable, and locally disconnected associations. It MUST use authenticated setup and completion with exact App, organization, permission, and installation-token verification, without personal GitHub App or organization-owner prerequisites. Clicking the action MUST NOT itself mark an installation verified or imply that the App is absent on GitHub. A pending manual setup SHALL show loading on its row and disable other `Install App` clicks.

#### Scenario: Installation status is loading or verified
- **GIVEN** installation status is unknown, currently being checked, or the organization has a verified association
- **WHEN** Settings renders the organization row
- **THEN** it hides `Install App`
- **AND** it shows a loading `Checking App` action while reconciliation is running

#### Scenario: Explicit setup reuses an existing installation
- **GIVEN** an admin with OAuth `read:org` access and active membership in an allowed organization clicks `Install App`
- **WHEN** authenticated setup returns an existing installation candidate
- **THEN** the client completes exact App, organization, permission, and installation-token verification without navigating to GitHub or requesting reinstallation
- **AND** successful completion refreshes status and hides the action
- **AND** a saved non-verified association can be restored only after successful verification following this explicit action

#### Scenario: Explicit setup opens GitHub when no installation is found
- **GIVEN** an admin with OAuth `read:org` access and active membership in an allowed organization clicks `Install App`
- **WHEN** setup succeeds without an existing installation candidate after GitHub returns 404
- **THEN** the client navigates in the current tab to the configured App installation URL containing the opaque setup state
- **AND** GitHub determines whether the account may install the App on the selected organization
- **AND** a callback for a personal account or another organization cannot establish the requested workspace link

#### Scenario: OAuth organization access is unavailable
- **GIVEN** the administrator lacks OAuth `read:org` access or active membership in the selected organization
- **WHEN** they click `Install App`
- **THEN** Settings reports targeted OAuth organization-access guidance without navigating to GitHub or activating an association
- **AND** it MUST NOT require or suggest personal GitHub App authorization as a substitute
