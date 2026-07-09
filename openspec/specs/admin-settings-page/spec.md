# Admin Settings Page Specification

## Purpose

Define the admin-web Settings page behavior for loading, editing, validating, and saving current API-supported workspace settings inside the authenticated admin shell.

## Requirements

### Requirement: Admin Settings Page Renders Current Workspace Settings

The admin Settings page MUST replace the placeholder with a PrimeVue/Tailwind workspace settings surface inside the authenticated admin shell, persisting only fields supported by the current API and presenting GitHub setup prerequisites in the approved settings layout.

#### Scenario: Settings page renders approved structure within API scope

- **WHEN** an authenticated admin opens the Settings page
- **THEN** the page renders settings cards sized to the approved 620px desktop treatment and responsive on small screens
- **AND** the workspace settings card renders editable current API fields for Workspace name, Default hourly rate, Currency, and Time zone
- **AND** Time zone is a full-width PrimeVue selector populated with contract-valid time-zone options, including `UTC` and IANA time-zone names, plus the current persisted time-zone value and current draft/form time-zone value
- **AND** the workspace settings card renders inactive future fields for Invoice prefix, Payment terms, Legal entity, and Tax ID matching the approved design sections
- **AND** the page shows bottom-aligned `Cancel` and primary `Save Settings` actions for the workspace settings form
- **AND** the page includes a GitHub Account card for the current user's connection prerequisite
- **AND** the page includes the GitHub Workspace Access card for workspace organization policy management

#### Scenario: Unsupported design fields are inactive and not saved

- **WHEN** the Settings page is implemented without API changes for design-only settings fields
- **THEN** design-only fields not supported by the current API are not submitted to any API endpoint
- **AND** the page presents invoice prefix, payment terms, legal entity, and tax ID only as disabled inactive future fields
- **AND** those inactive future fields do not affect dirty-state, validation, cancel, or save payloads

### Requirement: Admin Settings Page Shows Current User GitHub Account Status

The admin Settings page MUST show the current user's GitHub account connection status before workspace GitHub organization setup.

#### Scenario: GitHub account status is loading

- **WHEN** the Settings page is waiting for the current user's GitHub connection status
- **THEN** the GitHub Account card renders a loading state
- **AND** the GitHub Workspace Access card does not expose the `Add organization` setup action

#### Scenario: GitHub account is connected

- **GIVEN** the current user has a connected GitHub account
- **WHEN** the Settings page renders GitHub account status
- **THEN** the GitHub Account card shows a connected state using safe account display details from the connection status response
- **AND** the GitHub Workspace Access card can expose the `Add organization` setup action when its own workspace policy state allows adding organizations

#### Scenario: Connected GitHub account loads selectable organizations

- **GIVEN** the current user has a connected GitHub account
- **AND** the workspace organization policy data has loaded successfully
- **WHEN** the Settings page renders organization setup controls
- **THEN** the page requests the current user's available GitHub organizations for setup
- **AND** the setup selector suggests only organization owners from that response that are not already allowed for the workspace
- **AND** the setup selector still accepts a manually typed GitHub organization login for backend-authoritative validation
- **AND** the setup selector does not expose GitHub token material or provider authorization details

#### Scenario: Available organization request failure preserves typed fallback

- **GIVEN** the current user's GitHub account status is connected
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

### Requirement: Admin Settings Page Loads Existing Workspace Configuration

The admin Settings page MUST load workspace identity and workspace settings from existing admin workspace endpoints.

#### Scenario: Initial load uses existing endpoints

- **WHEN** the Settings page initializes
- **THEN** it requests the current workspace through `GET /workspace`
- **AND** it requests workspace settings through `GET /workspace/settings`
- **AND** it initializes form state from those authoritative responses, including `timeZone`
- **AND** the authenticated admin shell uses the current workspace response for the visible workspace label instead of a hardcoded workspace name

#### Scenario: Initial loading renders structured skeleton

- **WHEN** required settings data is still loading
- **THEN** the page renders a PrimeVue Skeleton surface approximating the header, settings card, editable fields including Time zone, and action row
- **AND** it does not render empty-state or default settings copy before the first request completes

#### Scenario: Initial request failure remains retryable

- **WHEN** required settings data fails to load
- **THEN** the page renders a request-error state with a retry affordance
- **AND** the failure is surfaced through standard toast feedback
- **AND** the failed load is not collapsed into empty or default settings data

### Requirement: Admin Settings Page Saves Existing Workspace Configuration

The admin Settings page MUST save changed current API fields through the existing workspace endpoint boundaries.

#### Scenario: Valid save persists changed API-supported fields

- **GIVEN** the admin has changed one or more supported settings fields
- **WHEN** the admin activates `Save Settings`
- **THEN** workspace name changes are sent through `PATCH /workspace`
- **AND** currency, default hourly rate, or time zone changes are sent through `PATCH /workspace/settings`
- **AND** unchanged resources and unchanged fields are not patched just to satisfy request schemas
- **AND** successful save refreshes or reconciles the rendered form from authoritative responses
- **AND** successful workspace name save updates the authenticated admin shell workspace label from the authoritative response
- **AND** the page shows success toast feedback

#### Scenario: Save failure preserves edits

- **GIVEN** the admin has changed one or more supported settings fields
- **WHEN** a save request fails validation, authorization, or persistence
- **THEN** the page keeps the pending form values available for correction or retry
- **AND** it shows error toast feedback using the repository error-message order
- **AND** it does not render the failed values as persisted state

#### Scenario: Cancel restores persisted settings

- **GIVEN** the admin has unsaved settings changes, including a Time zone change
- **WHEN** the admin activates `Cancel`
- **THEN** the page restores the latest successfully loaded or saved workspace and settings values
- **AND** no update request is sent

### Requirement: Admin Settings Form Validates Current API Payloads

The admin Settings form MUST validate form input before sending existing API update payloads.

#### Scenario: Invalid settings are blocked before API calls

- **WHEN** the admin submits invalid settings input
- **THEN** the page shows field-level validation feedback through PrimeVue invalid/helper UI
- **AND** no workspace or workspace-settings update request is sent

#### Scenario: Invalid time zone is blocked before API calls

- **GIVEN** an invalid time-zone value is represented in the Settings form state
- **WHEN** the admin activates `Save Settings`
- **THEN** the page shows field-level validation feedback for Time zone
- **AND** no workspace or workspace-settings update request is sent

#### Scenario: Nullable hourly rate stays explicit

- **WHEN** the optional default hourly rate is cleared
- **THEN** the settings update submits `defaultHourlyRate` as `null` when that field changed
- **AND** omitted unchanged fields are not sent only to satisfy the update schema
