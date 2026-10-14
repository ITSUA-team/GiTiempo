## MODIFIED Requirements

### Requirement: Admin Settings Page Shows Current User GitHub Account Status

The admin Settings page MUST show the current user's GitHub identity and distinct OAuth organization and personal App capabilities before workspace GitHub organization setup. Workspace installation state SHALL remain separate.

#### Scenario: GitHub account status is loading

- **WHEN** the Settings page is waiting for the current user's GitHub connection status
- **THEN** the GitHub Account card renders a loading state
- **AND** the GitHub Workspace Access card does not expose the `Add organization` setup action

#### Scenario: GitHub account is connected

- **GIVEN** the current user has a connected GitHub account
- **WHEN** the Settings page renders GitHub account status
- **THEN** the GitHub Account card shows a connected state using safe account display details from the connection status response
- **AND** the GitHub Workspace Access card can expose the `Add organization` setup action when OAuth organizationDiscovery is ready and its own workspace policy state allows adding organizations

#### Scenario: Connected GitHub account loads selectable organizations

- **GIVEN** the current user has ready OAuth organizationDiscovery capability
- **AND** the workspace organization policy data has loaded successfully
- **WHEN** the Settings page renders organization setup controls
- **THEN** the page requests the current user's available GitHub organizations for setup
- **AND** the setup selector suggests only organization owners from that response that are not already allowed for the workspace
- **AND** the setup selector still accepts a manually typed GitHub organization login for backend-authoritative validation
- **AND** the setup selector does not expose GitHub token material or provider authorization details

#### Scenario: Available organization request failure preserves typed fallback

- **GIVEN** the current user's OAuth organizationDiscovery capability is ready
- **WHEN** the available GitHub organizations request fails
- **THEN** the GitHub Workspace Access card renders retryable error guidance for the selector
- **AND** the add input still accepts a manually typed GitHub organization login when the workspace policy state allows setup
- **AND** it does not send organization add requests for empty or invalid organization login input

#### Scenario: GitHub account is disconnected

- **GIVEN** the current user has no connected GitHub account
- **WHEN** the Settings page renders GitHub account status
- **THEN** the GitHub Account card explains that connecting GitHub is required before adding workspace organizations
- **AND** the card links to the user profile GitHub connection flow when a profile URL can be built
- **AND** the GitHub Workspace Access card does not expose the `Add organization` setup action

#### Scenario: GitHub account status request fails

- **WHEN** the Settings page cannot load the current user's GitHub connection status
- **THEN** the GitHub Account card renders retryable error guidance
- **AND** the GitHub Workspace Access card does not expose the `Add organization` setup action
- **AND** existing workspace settings form data is not replaced with default values because the GitHub account status request failed

#### Scenario: Existing organizations remain visible while disconnected

- **GIVEN** the current workspace has saved allowed GitHub organization policy rows
- **AND** the requesting admin has no active GitHub connection
- **WHEN** the Settings page renders the GitHub Workspace Access card
- **THEN** the card still shows the saved allowed organizations
- **AND** each saved organization still offers the existing workspace policy removal action
- **AND** the disconnected account state only gates adding new organizations

#### Scenario: OAuth-only account can discover before installation
- **GIVEN** the admin has OAuth read:org but no personal App grant or workspace installation
- **WHEN** Settings loads organization setup
- **THEN** the selector SHALL use OAuth discovery and allow validated additions
- **AND** the page MUST NOT imply that this enables browsing/import or installation tracking

#### Scenario: Missing OAuth scope offers targeted recovery
- **GIVEN** the identity is linked but OAuth organizationDiscovery is not ready
- **WHEN** Settings renders the account and workspace cards
- **THEN** the page SHALL explain the OAuth authorization or permission requirement and offer the existing Profile recovery path
- **AND** it MUST NOT submit additions until ready or ask the user to install an App as a fix for missing OAuth scopes

#### Scenario: Installation setup retains its own prerequisites
- **GIVEN** the admin added an organization using OAuth
- **WHEN** the admin starts installation discovery or verification
- **THEN** the UI SHALL respect the existing personal App authorization and installation-owner checks
- **AND** it SHALL show targeted App authorization guidance when needed without disabling OAuth organization discovery

#### Scenario: Empty results differ from errors
- **GIVEN** the admin has ready OAuth discovery capability
- **WHEN** the selector receives an empty success, missing-permission response or provider failure
- **THEN** the UI SHALL show distinct empty, permission-recovery or retryable error states
- **AND** manual input SHALL remain available after a transient discovery failure but SHALL NOT bypass missing OAuth permission or server validation
