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
- **AND** the page offers editable Invoice sender and Payment defaults sections including Invoice prefix, Payment terms, Legal entity and optional Tax ID
- **AND** the page shows bottom-aligned `Cancel` and primary `Save Settings` actions for the workspace settings form
- **AND** the page includes a GitHub Account card for the current user's connection prerequisite
- **AND** the page includes the GitHub Workspace Access card for workspace organization policy management

#### Scenario: Unsupported design fields are inactive and not saved

- **GIVEN** the page presents a field outside the current workspace settings or invoice defaults contract
- **WHEN** the Admin saves a form
- **THEN** unsupported fields stay inactive and cannot affect validation, dirty state or the save payload

## ADDED Requirements

### Requirement: Workspace invoice sender and payment defaults

The Settings page MUST allow Admins to manage workspace defaults for the invoice issuer and payment instructions. A saved invoice retains the details and optional logo that were applied to it.

#### Scenario: Admin saves invoice defaults

- **GIVEN** an Admin opens Settings in a workspace
- **WHEN** the Admin opens the invoice defaults form
- **THEN** it displays the saved sender/legal name, address, billing email, optional tax ID, optional logo, invoice reference prefix, payment method, terms, beneficiary, bank or payment provider, account details and instructions
- **AND** Save invoice defaults persists the edited profile in that workspace for new invoices, independently of the general workspace form
- **AND** existing invoice references, business details and PDF content remain as saved

#### Scenario: Upload or remove the optional logo

- **GIVEN** an Admin edits the sender profile
- **WHEN** they upload a supported PNG or SVG logo or remove the current logo and save
- **THEN** subsequent invoices can use the revised profile, and invoices created without a logo can still be exported

#### Scenario: Recover from a failed save

- **GIVEN** an Admin has unsaved changes
- **WHEN** validation or saving fails
- **THEN** the form identifies the failure and retains all pending values for correction and retry

#### Scenario: Mobile invoice defaults

- **GIVEN** an Admin opens Settings on a narrow viewport
- **WHEN** they edit the invoice profile
- **THEN** full-width stacked fields, logo controls and a reachable save action support the same workflow as desktop

#### Scenario: Authorized PM uses defaults within invoices

- **GIVEN** a PM with invoice access opens invoice creation
- **WHEN** the page loads its invoice defaults
- **THEN** it retrieves the permitted defaults in the invoice workflow without displaying or querying the Admin Settings page
