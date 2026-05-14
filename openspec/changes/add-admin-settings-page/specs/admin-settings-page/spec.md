## ADDED Requirements

### Requirement: Admin Settings Page Renders Current Workspace Settings

The admin Settings page MUST replace the placeholder with a PrimeVue/Tailwind workspace settings surface inside the authenticated admin shell, persisting only fields supported by the current API.

#### Scenario: Settings page renders approved structure within API scope

- **WHEN** an authenticated admin opens the Settings page
- **THEN** the page renders a `Settings` header with supporting copy based on the approved `GITiempo.pen` Settings design
- **AND** the page shows a single settings card sized to the approved 620px desktop treatment and responsive on small screens
- **AND** the card renders editable current API fields for Workspace name, Default hourly rate, and Currency
- **AND** the card renders inactive future fields for Invoice prefix, Payment terms, Legal entity, and Tax ID matching the approved design sections
- **AND** the page shows bottom-aligned `Cancel` and primary `Save Settings` actions

#### Scenario: Unsupported design fields are inactive and not saved

- **WHEN** the Settings page is implemented without API changes
- **THEN** design-only fields not supported by the current API are not submitted to any API endpoint
- **AND** the page presents invoice prefix, payment terms, legal entity, and tax ID only as disabled inactive future fields
- **AND** those inactive future fields do not affect dirty-state, validation, cancel, or save payloads

### Requirement: Admin Settings Page Loads Existing Workspace Configuration

The admin Settings page MUST load workspace identity and workspace settings from existing admin workspace endpoints.

#### Scenario: Initial load uses existing endpoints

- **WHEN** the Settings page initializes
- **THEN** it requests the current workspace through `GET /workspace`
- **AND** it requests workspace settings through `GET /workspace/settings`
- **AND** it initializes form state from those authoritative responses

#### Scenario: Initial loading renders structured skeleton

- **WHEN** required settings data is still loading
- **THEN** the page renders a PrimeVue Skeleton surface approximating the header, settings card, fields, and action row
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
- **AND** currency or default hourly rate changes are sent through `PATCH /workspace/settings`
- **AND** unchanged resources are not patched just to satisfy request schemas
- **AND** successful save refreshes or reconciles the rendered form from authoritative responses
- **AND** the page shows success toast feedback

#### Scenario: Save failure preserves edits

- **GIVEN** the admin has changed one or more supported settings fields
- **WHEN** a save request fails validation, authorization, or persistence
- **THEN** the page keeps the pending form values available for correction or retry
- **AND** it shows error toast feedback using the repository error-message order
- **AND** it does not render the failed values as persisted state

#### Scenario: Cancel restores persisted settings

- **GIVEN** the admin has unsaved settings changes
- **WHEN** the admin activates `Cancel`
- **THEN** the page restores the latest successfully loaded or saved workspace and settings values
- **AND** no update request is sent

### Requirement: Admin Settings Form Validates Current API Payloads

The admin Settings form MUST validate form input before sending existing API update payloads.

#### Scenario: Invalid settings are blocked before API calls

- **WHEN** the admin submits invalid settings input
- **THEN** the page shows field-level validation feedback through PrimeVue invalid/helper UI
- **AND** no workspace or workspace-settings update request is sent

#### Scenario: Nullable hourly rate stays explicit

- **WHEN** the optional default hourly rate is cleared
- **THEN** the settings update submits `defaultHourlyRate` as `null` when that field changed
- **AND** omitted unchanged fields are not sent only to satisfy the update schema
