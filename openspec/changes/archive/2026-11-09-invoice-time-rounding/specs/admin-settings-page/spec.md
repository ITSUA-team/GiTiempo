# Spec Delta

## MODIFIED Requirements

### Requirement: Admin Settings Page Renders Current Workspace Settings

The admin Settings page MUST replace the placeholder with a PrimeVue/Tailwind workspace settings surface inside the authenticated admin shell, persisting only fields supported by the current API and presenting GitHub setup prerequisites in the approved settings layout. The workspace settings card gains an editable `Time rounding step (minutes)` Select (presets 1, 5, 10, 15, 30, 60, default 1); rounding is always active, so there is no no-rounding option.

#### Scenario: Settings page renders approved structure within API scope

- **WHEN** an authenticated admin opens the Settings page
- **THEN** the page renders settings cards sized to the approved 620px desktop treatment and responsive on small screens
- **AND** the workspace settings card renders editable current API fields for Workspace name, Default hourly rate, Currency, Time zone, and Time rounding step (minutes)
- **AND** Time zone is a full-width PrimeVue selector populated with contract-valid time-zone options, including `UTC` and IANA time-zone names, plus the current persisted time-zone value and current draft/form time-zone value
- **AND** Time rounding step (minutes) is an editable PrimeVue `<Select>` with preset options 1, 5, 10, 15, 30, 60 and a default of 1 minute, placed near the Default hourly rate and Currency row
- **AND** the rounding step control is initialized from the loaded workspace settings `timeRoundingStepMinutes` value
- **AND** the workspace settings card renders inactive future fields for Invoice prefix, Payment terms, Legal entity, and Tax ID matching the approved design sections
- **AND** the page shows bottom-aligned `Cancel` and primary `Save Settings` actions for the workspace settings form
- **AND** the page includes a GitHub Account card for the current user's connection prerequisite
- **AND** the page includes the GitHub Workspace Access card for workspace organization policy management

#### Scenario: Unsupported design fields are inactive and not saved

- **WHEN** the Settings page is implemented without API changes for design-only settings fields
- **THEN** design-only fields not supported by the current API are not submitted to any API endpoint
- **AND** the page presents invoice prefix, payment terms, legal entity, and tax ID only as disabled inactive future fields
- **AND** those inactive future fields do not affect dirty-state, validation, cancel, or save payloads

### Requirement: Admin Settings Page Saves Existing Workspace Configuration

The admin Settings page MUST save changed current API fields through the existing workspace endpoint boundaries. `timeRoundingStepMinutes` changes are saved through `PATCH /workspace/settings` alongside the other workspace settings fields.

#### Scenario: Valid save persists changed API-supported fields

- **GIVEN** the admin has changed one or more supported settings fields
- **WHEN** the admin activates `Save Settings`
- **THEN** workspace name changes are sent through `PATCH /workspace`
- **AND** currency, default hourly rate, time zone, or time rounding step changes are sent through `PATCH /workspace/settings`
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

- **GIVEN** the admin has unsaved settings changes, including a Time zone or Time rounding step change
- **WHEN** the admin activates `Cancel`
- **THEN** the page restores the latest successfully loaded or saved workspace and settings values
- **AND** no update request is sent

### Requirement: Admin Settings Form Validates Current API Payloads

The admin Settings form MUST validate form input before sending existing API update payloads. The time rounding step must be an integer between 1 and 60.

#### Scenario: Invalid settings are blocked before API calls

- **WHEN** the admin submits invalid settings input
- **THEN** the page shows field-level validation feedback through PrimeVue invalid/helper UI
- **AND** no workspace or workspace-settings update request is sent

#### Scenario: Invalid time zone is blocked before API calls

- **GIVEN** an invalid time-zone value is represented in the Settings form state
- **WHEN** the admin activates `Save Settings`
- **THEN** the page shows field-level validation feedback for Time zone
- **AND** no workspace or workspace-settings update request is sent

#### Scenario: Invalid time rounding step is blocked before API calls

- **GIVEN** the Settings form state holds a `timeRoundingStepMinutes` value that is not an integer between 1 and 60
- **WHEN** the admin activates `Save Settings`
- **THEN** the page shows field-level validation feedback for Time rounding step (minutes)
- **AND** no workspace or workspace-settings update request is sent

#### Scenario: Nullable hourly rate stays explicit

- **WHEN** the optional default hourly rate is cleared
- **THEN** the settings update submits `defaultHourlyRate` as `null` when that field changed
- **AND** omitted unchanged fields are not sent only to satisfy the update schema