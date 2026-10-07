## ADDED Requirements

### Requirement: Installation Links Require Verified Administrator Authority
The system SHALL allow only an active GiTiempo workspace admin to link an organization installation of the configured GitHub App. Before activating the link, the backend MUST verify the installation's App identity and stable organization account identity, the requesting admin's access to that exact installation, and their active organization-owner authority through GitHub. A submitted installation identifier, callback query, or existing organization allow-list entry MUST NOT establish authority by itself. Interactive setup state MUST be single-use, expiring, and bound to the initiating GiTiempo user, workspace, and organization.

#### Scenario: Authorized owner links an installation
- **GIVEN** an active workspace admin has a usable personal GitHub connection and is an active owner of the selected allowed GitHub organization
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

### Requirement: Installation Associations Are Workspace Scoped
The system SHALL keep at most one current installation association per workspace and stable GitHub organization identity. Each workspace MUST independently authorize its association, even if multiple workspaces use the same GitHub installation. Existing policy rows MUST remain unverified until explicit setup succeeds. Replacing or disconnecting a link MUST preserve project, task, assignment, and time-entry history.

#### Scenario: Existing allow-list row has no installation
- **GIVEN** a workspace already allows an organization but has never verified its installation
- **WHEN** a member attempts a GitHub timer start
- **THEN** the backend rejects it with an installation-setup error
- **AND** the allow-list row grants no provider access

#### Scenario: Another workspace has a valid link
- **GIVEN** workspace A has a verified installation association and workspace B does not
- **WHEN** a member acting in workspace B requests the same repository
- **THEN** workspace A's association is not used to authorize the request

#### Scenario: Disconnect preserves records and disables new starts
- **GIVEN** a workspace has a verified association and historical tracking records
- **WHEN** an active workspace admin disconnects the association without a usable personal GitHub connection
- **THEN** new GitHub starts through that association are blocked and its cached credentials are invalidated
- **AND** historical records and owned running timers remain available under existing GiTiempo authorization

### Requirement: Installation Credentials Remain Server Owned
The backend SHALL obtain short-lived installation access tokens within the installation's granted permissions and repository selection. It MUST renew expired or near-expiry tokens without interaction from tracking members, limit retries, and never substitute a user's credentials after installation authorization fails. The App private key, App JWTs, installation tokens, and setup user credentials MUST NOT appear in browser payloads, extension storage, client bundles, or logs.

#### Scenario: Expired token is renewed automatically
- **GIVEN** a verified active installation with an expired cached token
- **WHEN** an authorized member starts a GitHub timer
- **THEN** the backend obtains a new installation token and performs fresh resource verification
- **AND** the member is not asked to connect GitHub

#### Scenario: Renewal cannot grant additional access
- **GIVEN** repository selection or granted permissions exclude a required resource
- **WHEN** the backend obtains or renews an installation token
- **THEN** it cannot widen the installation's access
- **AND** the timer request is rejected without partial tracking writes

#### Scenario: Token remains internal
- **GIVEN** successful setup, token renewal, a provider failure, or a tracking response
- **WHEN** the system produces responses, browser state, or logs
- **THEN** no GitHub credential or private key is exposed

### Requirement: Installation Lifecycle Changes Revoke Tracking Access
The system SHALL process authenticated GitHub installation and repository-access lifecycle events idempotently, invalidate affected credential caches, and block new starts for suspended, removed, or locally disconnected associations. The backend MUST verify required resources on every new GitHub start and treat provider denial as authoritative even when a lifecycle event is delayed. Reordered or repeated events MUST NOT reactivate a disconnected or removed link without current verification.

#### Scenario: Installation is suspended or uninstalled
- **GIVEN** GitHub suspends or removes an associated installation
- **WHEN** a verified lifecycle event is received or a subsequent provider check detects the loss
- **THEN** the association cannot authorize new starts
- **AND** owned running timers can still be stopped without a GitHub call

#### Scenario: A repository is removed from installation access
- **GIVEN** a cached installation token and a previously accessible repository
- **WHEN** GitHub removes access to that repository
- **THEN** new starts for its issues are rejected without task or time-entry writes
- **AND** access to other repositories is evaluated independently

#### Scenario: Forged or replayed lifecycle delivery arrives
- **GIVEN** a delivery with an invalid signature or a previously processed delivery identifier
- **WHEN** the webhook is handled
- **THEN** an invalid signature causes rejection and no state mutation
- **AND** a repeated valid delivery causes no duplicate side effects

### Requirement: Settings Automatically Confirms Existing App Installations
Admin Settings SHALL retain the existing GitHub Workspace Access organization-policy UI: one allowed-organization row with its login, `Allowed for this workspace`, and `Remove`. It SHALL additionally offer `Install App` beside `Remove` under the explicit setup conditions below, without installation status labels, association-only rows, or a separate installations card. After loading allowed organizations and after successfully adding one, an eligible connected workspace administrator SHALL automatically attempt setup only for organizations with no saved installation association. The automatic flow MUST complete the same state, owner, installation visibility, App, organization, and permission checks as explicit setup. Tracking members MUST NOT be prompted to establish a personal GitHub connection.

#### Scenario: Existing GitHub App is confirmed automatically
- **GIVEN** an allowed organization has no saved association but already has the configured GitHub App installed
- **AND** the current workspace administrator has a usable personal GitHub connection and active organization-owner authority
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
- **AND** the current workspace admin has no usable personal GitHub connection or is not an active organization owner
- **WHEN** Admin Settings loads or adds the organization
- **THEN** GiTiempo does not persist an association
- **AND** it leaves the Workspace Access policy UI unchanged

### Requirement: Settings Offers Explicit Installation Setup
Admin Settings SHALL show `Install App` beside `Remove` only after installation status has loaded successfully and the allowed organization has no `verified` association. The action SHALL be available for absent, suspended, unavailable, and locally disconnected associations. It MUST use authenticated setup and completion with full authority verification. Clicking the action MUST NOT itself mark an installation verified or imply that the App is absent on GitHub. A pending manual setup SHALL show loading on its row and disable other `Install App` clicks.

#### Scenario: Status is unknown or already verified
- **GIVEN** installation status has not loaded successfully or the organization has a verified association
- **WHEN** Settings renders the organization row
- **THEN** it hides `Install App`

#### Scenario: Explicit setup reuses an existing installation
- **GIVEN** an eligible connected organization owner clicks `Install App`
- **WHEN** authenticated setup returns an existing installation candidate
- **THEN** the client completes full verification without navigating to GitHub or requesting reinstallation
- **AND** successful completion refreshes status and hides the action
- **AND** a saved non-verified association can be restored only after successful verification following this explicit action

#### Scenario: Explicit setup opens GitHub when no installation is found
- **GIVEN** an eligible connected organization owner clicks `Install App`
- **WHEN** setup succeeds without an existing installation candidate after GitHub returns 404
- **THEN** the client navigates in the current tab to the configured App installation URL containing the opaque setup state
- **AND** the administrator selects the intended organization on GitHub
- **AND** a callback for a personal account or another organization cannot establish the requested workspace link

#### Scenario: Setup cannot proceed
- **GIVEN** the administrator lacks a usable personal GitHub connection or setup fails an authority, configuration, or discovery check
- **WHEN** they click `Install App`
- **THEN** Settings reports the failure without navigating to GitHub or activating an association

### Requirement: Setup Failures Distinguish Installation Access From Owner Authority
When provider lookups succeed but the administrator's user token cannot access the exact installation, completion SHALL reject with HTTP 409 and `Reconnect GitHub, then retry installation verification`. When installation access is confirmed but active organization-owner membership or the expected organization identity cannot be confirmed, completion SHALL reject with HTTP 403 and `GitHub organization owner authority is required`. These messages SHALL preserve all existing authorization checks and MUST NOT activate or replace an association on failure. Reconnection is setup recovery guidance and MUST NOT be presented as a guaranteed remedy or a tracking-member prerequisite.

#### Scenario: User token cannot access the installed App
- **GIVEN** provider lookups succeed but the exact installation is absent from the administrator's accessible installations
- **WHEN** completion verifies setup authority
- **THEN** it returns the HTTP 409 reconnect guidance
- **AND** after reconnecting their GitHub account the administrator can retry `Install App` with fresh setup state to verify the existing installation

#### Scenario: User can access the installation but lacks owner authority
- **GIVEN** the exact installation is accessible but active owner membership or the expected organization identity does not match
- **WHEN** completion verifies setup authority
- **THEN** it returns the HTTP 403 owner-authority error
