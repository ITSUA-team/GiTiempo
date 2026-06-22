## ADDED Requirements

### Requirement: Admin Projects Page Edits Project Billable Default
The admin Projects page MUST expose the project default billable value in project creation and settings flows and MUST save future-default changes before offering existing-record propagation.

#### Scenario: Add Project form includes task billable default
- **WHEN** an admin or PM opens the Add Project page
- **THEN** the form includes `Default billable for new tasks`
- **AND** submitting the form sends the selected project default billable value with the project create request

#### Scenario: Project settings form includes task billable default
- **GIVEN** the Projects page has loaded project rows
- **WHEN** an admin or PM opens a project's settings row
- **THEN** the form includes `New task billable default`
- **AND** the control is initialized from the project's `defaultBillableForTasks` value

#### Scenario: Saving changed project default persists future default immediately
- **GIVEN** an admin or PM changes `New task billable default`
- **WHEN** they save the project settings form
- **THEN** the page sends the new default in the project update request
- **AND** it treats the returned project as the authoritative future-default state

### Requirement: Admin Projects Page Prompts For Project Existing-Record Backfill
The admin Projects page MUST show the approved follow-up popup only after a project default billable value has changed and the project already has downstream records that can be updated.

#### Scenario: Project follow-up popup appears after saved default change with existing records
- **GIVEN** a project default billable save succeeds
- **AND** the saved default differs from the previous value
- **AND** the project has existing tasks or existing time entries
- **WHEN** the save flow settles
- **THEN** the page opens a PrimeVue Dialog titled `Update project billable default?`
- **AND** the popup explains that the future default is already saved

#### Scenario: Project follow-up popup offers only backfill choices
- **GIVEN** the project follow-up popup is open
- **WHEN** the popup renders
- **THEN** it offers checkbox choices for updating existing tasks in the project and existing time entries in the project
- **AND** it renders a primary action labeled `Update existing records`
- **AND** it does not render a separate `keep future defaults only` action

#### Scenario: Dismissing project follow-up leaves existing records unchanged
- **GIVEN** the project follow-up popup is open after the future default was saved
- **WHEN** the user dismisses the popup without choosing the primary action
- **THEN** the page sends no project backfill request
- **AND** existing tasks and time entries remain unchanged

#### Scenario: Confirming project follow-up requests selected backfills
- **GIVEN** the project follow-up popup is open
- **WHEN** the user selects one or both backfill choices and activates `Update existing records`
- **THEN** the page calls the project billable-default backfill endpoint with the selected choices
- **AND** success feedback uses the returned update counts
- **AND** failure feedback keeps the saved future default visible and does not imply existing records were updated

#### Scenario: No project follow-up appears when no downstream records exist
- **GIVEN** a project default billable save succeeds
- **AND** the project has no existing tasks and no existing time entries
- **WHEN** the save flow settles
- **THEN** the page does not show the project follow-up popup
