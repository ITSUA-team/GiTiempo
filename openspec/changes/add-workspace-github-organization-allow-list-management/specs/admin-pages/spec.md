## ADDED Requirements

### Requirement: Settings Page Manages GitHub Workspace Access
The admin Settings page MUST provide an interactive GitHub Workspace Access card for managing the workspace GitHub organization allow-list.

#### Scenario: Settings page renders allowed organization management
- **GIVEN** an admin opens the Settings page
- **WHEN** the GitHub Workspace Access card loads successfully
- **THEN** the card shows the saved allowed GitHub organization logins
- **AND** each saved organization row shows helper copy indicating it is allowed for the workspace
- **AND** each row exposes a remove action
- **AND** the card exposes an Organization login field and primary Add organization action

#### Scenario: Settings page shows empty organization policy state
- **GIVEN** an admin opens the Settings page
- **AND** the workspace has no allowed GitHub organizations
- **WHEN** the GitHub Workspace Access card loads successfully
- **THEN** the card shows an empty state for allowed organizations
- **AND** the Add organization form remains available

#### Scenario: Settings page validates add organization input
- **GIVEN** an admin enters an empty or whitespace-only organization login
- **WHEN** the admin activates Add organization
- **THEN** the page shows field-level validation feedback
- **AND** no add organization request is sent

#### Scenario: Settings page adds organization
- **GIVEN** an admin enters a valid organization login
- **WHEN** the admin activates Add organization and the backend saves the policy row
- **THEN** the card reconciles from the authoritative response or refreshed policy list
- **AND** the page shows success toast feedback

#### Scenario: Settings page handles add organization failure
- **GIVEN** an admin enters an organization login that the backend rejects
- **WHEN** the add organization request fails
- **THEN** the card keeps the entered login available for correction
- **AND** the page shows error feedback without adding a local-only organization row

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

#### Scenario: Non-admin cannot reach management card through shell navigation
- **GIVEN** an authenticated user is not an admin member of the workspace
- **WHEN** the admin shell renders available navigation
- **THEN** the Settings route remains unavailable according to existing role-aware admin navigation behavior
