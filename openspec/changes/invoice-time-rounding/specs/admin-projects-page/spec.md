# Spec Delta

## ADDED Requirements

### Requirement: Admin Projects Page Edits Project Time Rounding Step

The admin Projects page MUST expose the project time rounding step in the project settings form so admins and PMs can configure the default per-entry rounding step for invoices scoped to the project.

#### Scenario: Project settings form includes time rounding step

- **GIVEN** the Projects page has loaded project rows
- **WHEN** an admin or PM opens a project's settings row
- **THEN** the form includes a `Time rounding step (minutes)` control
- **AND** the control is initialized from the project's `timeRoundingStepMinutes` value
- **AND** the control offers common presets (1, 5, 10, 15, 30, 60) and a no-rounding (null) option

#### Scenario: Saving changed rounding step persists the project default

- **GIVEN** an admin or PM changes `Time rounding step (minutes)`
- **WHEN** they save the project settings form
- **THEN** the page sends the new `timeRoundingStepMinutes` in the project update request
- **AND** the page refreshes project rows after save

#### Scenario: Clearing the rounding step saves null

- **GIVEN** an admin or PM selects the no-rounding option
- **WHEN** they save the project settings form
- **THEN** the page sends `timeRoundingStepMinutes: null` in the project update request

#### Scenario: Add Project form includes time rounding step

- **WHEN** an admin or PM opens the Add Project page
- **THEN** the form includes a `Time rounding step (minutes)` control defaulting to no rounding (null)
- **AND** submitting the form sends the selected `timeRoundingStepMinutes` with the project create request