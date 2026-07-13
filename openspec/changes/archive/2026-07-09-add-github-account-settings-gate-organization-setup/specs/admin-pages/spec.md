## MODIFIED Requirements

### Requirement: Settings Page Manages GitHub Workspace Access

The admin Settings page MUST provide an interactive GitHub Workspace Access card for managing the workspace GitHub organization allow-list, with organization setup gated by the current user's GitHub account connection status.

#### Scenario: Settings page renders allowed organization management

- **GIVEN** an admin opens the Settings page
- **WHEN** the GitHub Workspace Access card loads successfully
- **THEN** the card shows the saved allowed GitHub organization logins
- **AND** each saved organization row shows helper copy indicating it is allowed for the workspace
- **AND** each row exposes a remove action
- **AND** the card exposes add-organization setup only when the current user's GitHub account is connected and setup data can be loaded

#### Scenario: Settings page shows empty organization policy state

- **GIVEN** an admin opens the Settings page
- **AND** the workspace has no allowed GitHub organizations
- **WHEN** the GitHub Workspace Access card loads successfully
- **THEN** the card shows an empty state for allowed organizations
- **AND** the add-organization setup remains hidden until the current user's GitHub account status is confirmed connected
- **AND** disconnected, loading, or failed GitHub account status renders prerequisite guidance instead of an available add form

#### Scenario: Settings page renders connected organization input

- **GIVEN** the current user's GitHub account status is connected
- **AND** the workspace organization policy data has loaded successfully
- **AND** the current user's available GitHub organizations have loaded successfully
- **WHEN** the GitHub Workspace Access card renders setup controls
- **THEN** the card exposes a GitHub organization selector populated from organizations visible to the current user's connected GitHub account
- **AND** the selector excludes organizations already allowed for the workspace
- **AND** the selector accepts a manually typed GitHub organization login when suggestions are incomplete or unavailable
- **AND** the card exposes the primary Add organization action for a selected organization or manually typed organization login

#### Scenario: Settings page validates add organization input

- **GIVEN** the connected organization selector is available
- **AND** no organization is selected or typed
- **WHEN** the admin activates Add organization
- **THEN** the page shows field-level validation feedback
- **AND** no add organization request is sent

#### Scenario: Settings page adds organization

- **GIVEN** the connected organization selector is available
- **AND** an admin selects or types a GitHub organization that is not already allowed for the workspace
- **WHEN** the admin activates Add organization and the backend saves the policy row
- **THEN** the card reconciles from the authoritative response or refreshed policy list
- **AND** the page shows success toast feedback

#### Scenario: Settings page handles add organization failure

- **GIVEN** the connected organization selector is available
- **AND** an admin selects or types a GitHub organization that the backend rejects
- **WHEN** the add organization request fails
- **THEN** the card keeps the selected or typed organization login available for correction or retry
- **AND** the page shows error feedback without adding a local-only organization row

#### Scenario: Settings page guides GitHub App access recovery

- **GIVEN** an admin selects or types a GitHub organization
- **AND** the backend rejects the add request with a frontend-safe recovery payload for missing GitHub connection, inaccessible organization, GitHub App blocked or needing approval, or retryable provider failure
- **WHEN** the Settings page renders the failed GitHub Workspace Access card
- **THEN** the card shows a GitHub App access recovery card group above the Add organization setup controls
- **AND** each recovery card instruction and action state is derived from the backend response step status
- **AND** each recovery card shows instruction copy and the appropriate action button or link without visible status tags
- **AND** the recovery cards include install GitHub App, approve or unblock organization access, reconnect GitHub account, and retry allow-list check steps
- **AND** GitHub actions open the configured GitHub App install URL or default GiTiempo GitHub App installation request URL in a new tab
- **AND** the reconnect action routes to the existing user profile GitHub connection flow
- **AND** the retry action reuses the selected or typed organization login without requiring the admin to reselect or retype it

#### Scenario: Settings page removes organization

- **GIVEN** an admin sees a saved allowed GitHub organization row
- **WHEN** the admin activates Remove and the backend removes the policy row
- **THEN** the row is removed from the rendered allow-list after authoritative reconciliation
- **AND** the page shows success toast feedback

#### Scenario: Settings page handles organization policy request errors

- **GIVEN** the GitHub Workspace Access policy request fails
- **WHEN** the Settings page renders the GitHub card
- **THEN** the card shows a request-error state with retry
- **AND** it does not render a default empty allow-list as a substitute for the failed request
- **AND** it does not expose add-organization setup from the failed policy state

#### Scenario: Non-admin cannot reach management card through shell navigation

- **GIVEN** an authenticated user is not an admin member of the workspace
- **WHEN** the admin shell renders available navigation
- **THEN** the Settings route remains unavailable according to existing role-aware admin navigation behavior
