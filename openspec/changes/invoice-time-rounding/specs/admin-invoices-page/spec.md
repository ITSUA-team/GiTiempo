# Spec Delta

## Purpose

Define the admin SPA invoice management surface behavior — list, search, filter, stats, create dialog, detail/edit page, status actions, and role-aware interactions for Admin and PM users. This capability is introduced jointly by the `add-admin-invoices-ui` change (base invoice UI) and this change (time rounding step in the create dialog).

## ADDED Requirements

### Requirement: Invoice Create Dialog Includes Time Rounding Step

The invoice create dialog MUST include a time rounding step field that is pre-filled from the project's default via the eligible-entries preview response and is overridable per-invoice without changing the project's `timeRoundingStepMinutes` setting.

#### Scenario: Rounding step field is pre-filled from preview

- **GIVEN** the admin or PM has entered both date range bounds and selected a project
- **WHEN** the eligible-entries preview response returns `defaultRoundingStepMinutes: 5`
- **THEN** the rounding step field is pre-filled with 5
- **AND** the previewed total hours reflect per-entry rounding with a 5-minute step

#### Scenario: Rounding step field defaults to no rounding when project has none

- **GIVEN** the preview response returns `defaultRoundingStepMinutes: null`
- **WHEN** the dialog renders the rounding step field
- **THEN** the field shows a no-rounding state
- **AND** the previewed total hours are computed without per-entry rounding

#### Scenario: Rounding step field defaults to no rounding for workspace-wide invoices

- **GIVEN** an admin creates a workspace-wide invoice without a project
- **WHEN** the preview response returns `defaultRoundingStepMinutes: null`
- **THEN** the rounding step field shows a no-rounding state

#### Scenario: User override of rounding step updates the preview

- **GIVEN** the rounding step field is pre-filled with 5
- **WHEN** the user changes it to 15
- **THEN** the preview request carries `roundingStepMinutes=15`
- **AND** the previewed total hours reflect per-entry rounding with a 15-minute step

#### Scenario: Rounding step override does not change project settings

- **GIVEN** the user overrides the rounding step from 5 to 15 in the create dialog
- **WHEN** the invoice is created
- **THEN** the invoice's `roundingStepMinutes` snapshot is 15
- **AND** the project's `timeRoundingStepMinutes` remains 5

#### Scenario: Rounding step is included in the create request

- **WHEN** the user submits the create invoice form
- **THEN** the create request body includes the current `roundingStepMinutes` value (or null for no rounding)

#### Scenario: Rounding step uses the same touched-flag pattern as rate and currency

- **GIVEN** the user has manually edited the rounding step field
- **WHEN** a new preview response arrives with a different `defaultRoundingStepMinutes`
- **THEN** the field is not overwritten by the preview default
- **AND** the user's manual value is preserved

#### Scenario: Invoice detail displays the snapshot rounding step

- **GIVEN** an invoice was created with `roundingStepMinutes: 5`
- **WHEN** the admin or PM views the invoice detail page
- **THEN** the detail summary shows the rounding step used for that invoice
- **AND** the displayed value matches the snapshot, not the project's current setting