# Spec Delta

## Purpose

Define the admin SPA invoice management surface behavior — list, search, filter, stats, create dialog, detail/edit page, status actions, and role-aware interactions for Admin and PM users. This capability is introduced jointly by the `add-admin-invoices-ui` change (base invoice UI) and this change (the time rounding step field with dynamic project-based pre-fill in the create dialog). Rounding is always active: the rounding step is a computation parameter resolved from the project or workspace, and the invoice detail page does not display it — only the rounded `totalHours` result is visible to the user.

## ADDED Requirements

### Requirement: Invoice Create Dialog Includes Time Rounding Step

The invoice create dialog MUST include a time rounding step field — a PrimeVue `<Select>` with presets 1, 5, 10, 15, 30, 60 and no no-rounding option — that is pre-filled from the effective rounding step returned by the eligible-entries preview response, updates dynamically when the selected project changes, and is overridable per-invoice without changing the project's `timeRoundingStepMinutes` setting.

#### Scenario: Rounding step field is pre-filled from preview

- **GIVEN** the admin or PM has entered both date range bounds and selected a project
- **AND** the eligible-entries preview response returns `defaultRoundingStepMinutes: 5`
- **WHEN** the dialog renders the rounding step field
- **THEN** the field is pre-filled with 5
- **AND** the previewed total hours reflect per-entry rounding with a 5-minute step

#### Scenario: Rounding step field updates when the project selection changes

- **GIVEN** the rounding step field is pre-filled with 5 for the currently selected project
- **AND** the user has not manually edited the rounding step field
- **WHEN** the user selects a different project whose preview response returns `defaultRoundingStepMinutes: 15`
- **THEN** the rounding step field updates to 15
- **AND** the previewed total hours reflect per-entry rounding with a 15-minute step

#### Scenario: Rounding step field uses the workspace default for workspace-wide invoices

- **GIVEN** an admin creates a workspace-wide invoice without a project
- **AND** the eligible-entries preview response returns the workspace's `defaultRoundingStepMinutes: 10`
- **WHEN** the dialog renders the rounding step field
- **THEN** the field is pre-filled with 10
- **AND** the previewed total hours reflect per-entry rounding with a 10-minute step

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
- **THEN** the create request body includes a non-null `roundingStepMinutes` value between 1 and 60

#### Scenario: Rounding step uses the same touched-flag pattern as rate and currency

- **GIVEN** the user has manually edited the rounding step field
- **WHEN** a new preview response arrives with a different `defaultRoundingStepMinutes`
- **THEN** the field is not overwritten by the preview default
- **AND** the user's manual value is preserved