# Spec Delta

## ADDED Requirements

### Requirement: Admin Projects Page Edits Project Time Rounding Step

The admin Projects page MUST expose the project time rounding step in the project settings form and the Add Project form so admins and PMs can configure the default per-entry rounding step for invoices scoped to the project. The value is a positive integer between 1 and 60, or null to inherit the workspace's `timeRoundingStepMinutes`; the Select MUST NOT offer a no-rounding option because rounding is always active.

#### Scenario: Project settings form includes time rounding step

- **GIVEN** the Projects page has loaded project rows
- **AND** the workspace's `timeRoundingStepMinutes` is 5
- **WHEN** an admin or PM opens a project's settings row
- **THEN** the form includes a `Time rounding step (minutes)` Select control
- **AND** the control offers `Inherit from workspace (5 min)` as the first option, followed by the presets 1, 5, 10, 15, 30, 60
- **AND** the control is initialized from the project's `timeRoundingStepMinutes` value
- **AND** the control offers no no-rounding option

#### Scenario: Settings form shows the inherited effective value

- **GIVEN** the Projects page has loaded project rows
- **AND** the workspace's `timeRoundingStepMinutes` is 5
- **AND** a project's `timeRoundingStepMinutes` is null
- **WHEN** an admin or PM opens that project's settings row
- **THEN** the `Time rounding step (minutes)` control shows `Inherit from workspace (5 min)` with N reflecting the current workspace default

#### Scenario: Selecting inherit saves null

- **GIVEN** an admin or PM selects `Inherit from workspace` in the `Time rounding step (minutes)` control
- **WHEN** they save the project settings form
- **THEN** the page sends `timeRoundingStepMinutes: null` in the project update request
- **AND** the saved project inherits the workspace rounding step

#### Scenario: Saving changed rounding step persists the project default

- **GIVEN** an admin or PM changes `Time rounding step (minutes)` to an explicit preset (for example 15)
- **WHEN** they save the project settings form
- **THEN** the page sends the new `timeRoundingStepMinutes` in the project update request
- **AND** the page refreshes project rows after save

#### Scenario: Add Project form includes time rounding step

- **WHEN** an admin or PM opens the Add Project page
- **THEN** the form includes a `Time rounding step (minutes)` Select control defaulting to `Inherit from workspace`
- **AND** submitting the form sends the selected `timeRoundingStepMinutes` (null when inheriting) with the project create request