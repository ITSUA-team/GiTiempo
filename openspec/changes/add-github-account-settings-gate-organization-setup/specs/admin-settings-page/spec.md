## ADDED Requirements

### Requirement: Admin Settings GitHub Account Gates Organization Setup

The admin Settings page SHALL render the requesting admin's GitHub account connection state in the `GitHub Workspace Access` card and SHALL render organization add controls only when that connection is active.

#### Scenario: Settings loads GitHub account status for the GitHub card

- **GIVEN** an authenticated admin opens the Settings page
- **WHEN** the `GitHub Workspace Access` card initializes
- **THEN** the page requests the requesting admin's GitHub connection status
- **AND** the card keeps GitHub token material hidden from the DOM and browser state
- **AND** the workspace allowed-organization list remains scoped to the current workspace

#### Scenario: Connected admin can access organization add controls

- **GIVEN** the requesting admin has an active GitHub connection
- **WHEN** the `GitHub Workspace Access` card renders
- **THEN** it shows the connected GitHub account identity using safe account fields such as login and avatar URL when available
- **AND** it renders the `Add organization` section with the `Organization login` field and `Add organization` action
- **AND** adding an organization keeps using the existing workspace GitHub organization policy endpoint and recovery-card flow

#### Scenario: Disconnected admin cannot access organization add controls

- **GIVEN** the requesting admin has no active GitHub connection
- **WHEN** the `GitHub Workspace Access` card renders
- **THEN** it hides the `Add organization` section, including the `Organization login` field and `Add organization` action
- **AND** it renders a GitHub account prompt that explains a connection is required before organizations can be added
- **AND** it provides a connect or reconnect path to the existing user profile GitHub connection surface when that destination is configured

#### Scenario: Existing organizations remain visible while disconnected

- **GIVEN** the current workspace has saved allowed GitHub organization policy rows
- **AND** the requesting admin has no active GitHub connection
- **WHEN** the Settings page renders the `GitHub Workspace Access` card
- **THEN** the card still shows the saved allowed organizations
- **AND** each saved organization still offers the existing workspace policy removal action
- **AND** the disconnected account state only gates adding new organizations

#### Scenario: GitHub account status loading stays distinct from organization policy loading

- **WHEN** the GitHub account status request or workspace organization policy request is still loading
- **THEN** the card renders loading UI for the specific section that is pending
- **AND** it does not render the `Add organization` controls until the account status is known to be connected
- **AND** it does not collapse pending data into empty, connected, or disconnected copy before the relevant request completes

#### Scenario: GitHub account status failure remains retryable

- **WHEN** the GitHub account status request fails
- **THEN** the card renders a retryable account-status error state and standard toast feedback
- **AND** it hides organization add controls until connection status is successfully loaded as connected
- **AND** it keeps the workspace allowed-organization list loading, empty, populated, or error state distinct from the account-status failure
