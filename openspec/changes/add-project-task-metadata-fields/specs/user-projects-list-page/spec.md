## ADDED Requirements

### Requirement: User Projects Task Dialogs Capture Metadata

The Projects list page MUST render and save Description, Priority, Status, and Assignees fields in both task create and task update dialogs.

#### Scenario: Create dialog renders task metadata fields
- **WHEN** the user opens the Projects task create dialog
- **THEN** the dialog renders Description, Priority, Status, and Assignees fields in addition to Project and Task title
- **AND** Status defaults to `Open`
- **AND** Priority defaults to `Medium`
- **AND** Assignees default to unassigned

#### Scenario: Create dialog saves task metadata fields
- **GIVEN** the user has opened the Projects task create dialog
- **WHEN** the user enters a description, chooses priority, status, and one or more assignees, and submits valid input
- **THEN** the create request includes the selected metadata values
- **AND** the created task row is refreshed from the authoritative task response

#### Scenario: Edit dialog pre-fills task metadata fields
- **GIVEN** a task row with description, priority, status, and assignee metadata is rendered
- **WHEN** the user opens that row's edit dialog
- **THEN** the dialog pre-fills Description, Priority, Status, and Assignees from the task response
- **AND** the project field remains display-only in update mode

#### Scenario: Edit dialog saves task metadata changes
- **GIVEN** the user has opened a Projects task edit dialog
- **WHEN** the user changes description, priority, status, or assignees and submits valid input
- **THEN** the update request includes the changed metadata values
- **AND** the rendered task row is refreshed from the authoritative task response

#### Scenario: Assignee options follow selected project
- **GIVEN** the user is creating or editing a Projects task
- **WHEN** the dialog renders the Assignees field
- **THEN** the selectable assignees are limited to active members assigned to the selected task project
- **AND** the user can clear all assignees to leave the task unassigned

#### Scenario: Task metadata validation remains retryable
- **WHEN** task metadata validation fails or the create/update request fails
- **THEN** the dialog remains open
- **AND** the page surfaces the specific validation or request error
- **AND** the user can correct the metadata and retry without reopening the dialog
