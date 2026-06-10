## MODIFIED Requirements

### Requirement: Invoice Creation Workflow

The invoices page SHALL provide invoice creation through a non-destructive modal workflow that follows the shared popup dialog footer pattern.

#### Scenario: Create invoice from dialog
- **GIVEN** a user opens the invoice creation flow
- **WHEN** the dialog is rendered
- **THEN** the dialog exposes project, date range, rate, discount, and total amount inputs
- **AND** the dialog footer shows the primary `Save Invoice` action
- **AND** the dialog footer does not show a `Cancel` dismissal button

#### Scenario: Invoice dialog dismissal uses popup close control
- **GIVEN** the invoice creation dialog is open and not saving
- **WHEN** the user activates the built-in dialog close control or existing non-destructive mask dismissal
- **THEN** the dialog closes without creating an invoice

### Requirement: Members Management Table Actions

The admin Members page SHALL use the member name as the inline settings entry point and SHALL NOT render a separate action column for the main members table.

#### Scenario: Member settings open from the member name
- **GIVEN** a manageable member row is rendered
- **WHEN** the user activates the member name
- **THEN** the inline member settings section opens
- **AND** the main members table does not render a separate `Actions` column with edit or remove icons
- **AND** the inline settings section keeps the role, project assignment, and `Remove member` controls available according to the member permissions

### Requirement: Projects Management Table Actions

The admin Projects page SHALL use the project name as the inline settings entry point and SHALL NOT render a separate row action column.

#### Scenario: Project settings own status-specific actions
- **GIVEN** a project row is rendered
- **WHEN** the user activates the project name
- **THEN** the inline project settings section opens
- **AND** the projects table does not render a separate `Actions` column with edit, archive, or unarchive icons
- **AND** active projects expose `Archive project` inside the inline settings section
- **AND** archived projects expose `Unarchive project` inside the inline settings section
