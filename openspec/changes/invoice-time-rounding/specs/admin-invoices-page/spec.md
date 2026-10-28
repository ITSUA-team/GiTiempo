# Spec Delta

## Purpose

Define the admin SPA invoice management surface behavior — list, search, filter, stats, create dialog, detail/edit page, status actions, and role-aware interactions for Admin and PM users. This capability is introduced jointly by the `add-admin-invoices-ui` change (base invoice UI) and this change (the time rounding step field with dynamic project-based pre-fill in the create dialog, and the rounded per-entry duration display in the detail page and create dialog preview). Rounding is always active: the rounding step is a computation parameter resolved from the project or workspace, and the invoice detail page does not display the step value — only the rounded `totalHours` result and the rounded per-entry durations are visible to the user.

## ADDED Requirements

### Requirement: Invoice Create Dialog Includes Time Rounding Step

The invoice create dialog MUST include a time rounding step field — a PrimeVue `<Select>` with presets 1, 5, 10, 15, 30, 60 and no no-rounding option — that is pre-filled from the effective rounding step returned by the eligible-entries preview response, updates dynamically when the selected project changes — both immediately from the project's own `timeRoundingStepMinutes` value (or the workspace default when the project inherits) and via the eligible-entries preview response, and is overridable per-invoice without changing the project's `timeRoundingStepMinutes` setting.

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

#### Scenario: Rounding step field updates immediately from the selected project before the preview fires

- **GIVEN** the user has not yet entered a date range (so no preview request has been made)
- **AND** the user has not manually edited the rounding step field
- **WHEN** the user selects a project whose `timeRoundingStepMinutes` is 15
- **THEN** the rounding step field immediately updates to 15
- **AND** no eligible-entries preview request is required for the update
- **AND** when the selected project has `timeRoundingStepMinutes` null (inherit), the field falls back to the workspace's `timeRoundingStepMinutes`

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

### Requirement: Invoice Surfaces Display Rounded Per-Entry Duration

The invoice detail page time-entries table and the create dialog eligible-entries preview MUST display the rounded billed duration per entry — the `roundedDurationSeconds` value from the response — not the original raw `durationSeconds`. The raw duration is retained in the response payload for transparency but is not the value rendered in the Duration column. The rounding step value itself is not displayed; only its effect on each entry's duration and the aggregate `totalHours` is visible.

#### Scenario: Invoice detail time-entries table shows rounded duration

- **GIVEN** an invoice was created with `roundingStepMinutes: 5`
- **AND** a linked time entry has `durationSeconds: 360` and `roundedDurationSeconds: 600`
- **WHEN** the admin or PM opens the invoice detail page
- **THEN** the time-entries table Duration column for that entry renders the rounded duration (10 minutes)
- **AND** the raw 6-minute duration is not rendered in the Duration column

#### Scenario: Create dialog eligible-entries preview shows rounded duration

- **GIVEN** the create dialog preview returns an entry with `durationSeconds: 360` and `roundedDurationSeconds: 600`
- **WHEN** the user expands the eligible time entries preview
- **THEN** the preview table Duration column for that entry renders the rounded duration (10 minutes)
- **AND** the raw 6-minute duration is not rendered in the Duration column

#### Scenario: Preview Duration column recalculates when the rounding step changes

- **GIVEN** the create dialog preview shows an entry whose `roundedDurationSeconds` is 600 (10 minutes) under a 5-minute step
- **WHEN** the user changes the `Rounding step` dropdown to 30
- **THEN** the eligible-entries preview re-fetches with `roundingStepMinutes=30`
- **AND** the preview table Duration column for that entry re-renders with the new rounded duration (30 minutes) from the fresh response
- **AND** the previously displayed 10-minute value is no longer rendered

#### Scenario: Rounding step value is not displayed on the invoice detail page

- **GIVEN** an invoice has a `roundingStepMinutes` snapshot of 5
- **WHEN** the admin or PM opens the invoice detail page
- **THEN** the rounding step value (5) is not rendered anywhere on the detail page
- **AND** only the rounded `totalHours` and the rounded per-entry durations reflect the rounding