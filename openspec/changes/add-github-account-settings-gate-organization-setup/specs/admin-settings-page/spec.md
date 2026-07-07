## MODIFIED Requirements

### Requirement: Admin Settings Page Renders Current Workspace Settings

The admin Settings page MUST replace the placeholder with a PrimeVue/Tailwind workspace settings surface inside the authenticated admin shell, persisting only fields supported by the current API and presenting GitHub setup prerequisites in the approved settings layout.

#### Scenario: Settings page renders approved structure within API scope

- **WHEN** an authenticated admin opens the Settings page
- **THEN** the page renders a `Settings` header with supporting copy based on the approved `GITiempo.pen` Settings design
- **AND** the page shows settings cards sized to the approved 620px desktop treatment and responsive on small screens
- **AND** the workspace settings card renders editable current API fields for Workspace name, Default hourly rate, Currency, and Time zone
- **AND** Time zone is a full-width PrimeVue selector populated with contract-valid time-zone options, including `UTC` and IANA time-zone names, plus the current persisted time-zone value and current draft/form time-zone value
- **AND** the workspace settings card renders inactive future fields for Invoice prefix, Payment terms, Legal entity, and Tax ID matching the approved design sections
- **AND** the page shows bottom-aligned `Cancel` and primary `Save Settings` actions for the workspace settings form
- **AND** the page includes a GitHub Account section for the current user's connection prerequisite
- **AND** the page includes the GitHub Workspace Access section for workspace organization policy management

#### Scenario: Unsupported design fields are inactive and not saved

- **WHEN** the Settings page is implemented without API changes for design-only settings fields
- **THEN** design-only fields not supported by the current API are not submitted to any API endpoint
- **AND** the page presents invoice prefix, payment terms, legal entity, and tax ID only as disabled inactive future fields
- **AND** those inactive future fields do not affect dirty-state, validation, cancel, or save payloads

## ADDED Requirements

### Requirement: Admin Settings Page Shows Current User GitHub Account Status

The admin Settings page MUST show the current user's GitHub account connection status before workspace GitHub organization setup.

#### Scenario: GitHub account status is loading

- **WHEN** the Settings page is waiting for the current user's GitHub connection status
- **THEN** the GitHub Account section renders a loading state
- **AND** the GitHub Workspace Access section does not expose the `Add organization` setup action

#### Scenario: GitHub account is connected

- **GIVEN** the current user has a connected GitHub account
- **WHEN** the Settings page renders GitHub account status
- **THEN** the GitHub Account section shows a connected state using safe account display details from the connection status response
- **AND** the GitHub Workspace Access section can expose the `Add organization` setup action when its own workspace policy state allows adding organizations

#### Scenario: Connected GitHub account loads selectable organizations

- **GIVEN** the current user has a connected GitHub account
- **AND** the workspace organization policy data has loaded successfully
- **WHEN** the Settings page renders organization setup controls
- **THEN** the page requests the current user's available GitHub organizations for setup
- **AND** the setup selector shows only organization owners from that response that are not already allowed for the workspace
- **AND** the setup selector does not expose GitHub token material or provider authorization details

#### Scenario: Available organization request failure blocks add requests

- **GIVEN** the current user's GitHub account status is connected
- **WHEN** the available GitHub organizations request fails
- **THEN** the GitHub Workspace Access section renders retryable error guidance for the selector
- **AND** it does not send organization add requests until a selectable organization is loaded and selected

#### Scenario: GitHub account is disconnected

- **GIVEN** the current user has no connected GitHub account
- **WHEN** the Settings page renders GitHub account status
- **THEN** the GitHub Account section explains that connecting GitHub is required before adding workspace organizations
- **AND** the GitHub Workspace Access section does not expose the `Add organization` setup action

#### Scenario: GitHub account status request fails

- **WHEN** the Settings page cannot load the current user's GitHub connection status
- **THEN** the GitHub Account section renders retryable error guidance
- **AND** the GitHub Workspace Access section does not expose the `Add organization` setup action
- **AND** existing workspace settings form data is not replaced with default values because the GitHub account status request failed
