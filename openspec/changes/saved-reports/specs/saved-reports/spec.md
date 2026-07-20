## ADDED Requirements

### Requirement: Report Presets Are Stored Per Workspace

The backend MUST persist named report presets scoped to a workspace. A preset MUST carry a name unique within its workspace (case-insensitive), the report configuration, the user who created it, and creation and update timestamps. Presets MUST be visible to every user authorized for the reports surface in that workspace, and MUST NOT be visible from any other workspace.

#### Scenario: Admin creates a preset
- **GIVEN** an authenticated admin in a workspace
- **WHEN** the admin creates a report preset with a name and a valid configuration
- **THEN** the backend stores the preset against that workspace
- **AND** the response includes the preset id, name, configuration, and timestamps

#### Scenario: Presets are listed for the workspace
- **GIVEN** presets exist in a workspace
- **WHEN** an authenticated admin or PM lists report presets
- **THEN** the backend returns every preset in that workspace
- **AND** presets belonging to other workspaces are absent

#### Scenario: Preset names are unique per workspace
- **GIVEN** a preset named `Monthly billing` exists in a workspace
- **WHEN** an admin or PM creates another preset with the same name, ignoring case
- **THEN** the backend rejects the request as a conflict
- **AND** the existing preset is unchanged

#### Scenario: The same name is available in another workspace
- **GIVEN** a preset named `Monthly billing` exists in one workspace
- **WHEN** an admin of a different workspace creates a preset with that name
- **THEN** the backend stores it successfully

### Requirement: Report Presets Capture The Report Configuration

A preset configuration MUST record the report date range, the ordered grouping path, the project and member scope, and the table column filters. The date range MUST be either a relative period resolved when the preset is opened, or an explicit absolute window. The backend MUST validate the configuration against the shared contract on write and reject configurations that do not conform.

#### Scenario: Preset stores a relative period
- **GIVEN** an authenticated admin creates a preset
- **WHEN** the configuration date range is a relative period such as `this_month`
- **THEN** the backend stores the period rather than concrete dates
- **AND** listing the preset returns the same relative period

#### Scenario: Preset stores an absolute window
- **GIVEN** an authenticated admin creates a preset
- **WHEN** the configuration date range is an absolute window with a start and end date
- **THEN** the backend stores those dates unchanged

#### Scenario: Preset stores grouping, scope, and column filters
- **GIVEN** an authenticated admin creates a preset
- **WHEN** the configuration carries an ordered grouping path, a project and member scope, and column filter selections
- **THEN** the backend stores every one of those values
- **AND** listing the preset returns them unchanged

#### Scenario: Invalid configuration is rejected
- **GIVEN** an authenticated admin or PM creates or updates a preset
- **WHEN** the configuration is missing required fields, carries an unknown grouping dimension, or names an unknown relative period
- **THEN** the backend rejects the request as a validation error
- **AND** no preset is created or modified

### Requirement: Report Presets Can Be Updated And Deleted

The backend MUST allow an authorized user to rename a preset, replace its configuration, and delete it. Any user authorized for the reports surface in the workspace MUST be able to update or delete any preset in that workspace.

#### Scenario: Preset configuration is overwritten
- **GIVEN** a preset exists in a workspace
- **WHEN** an authenticated admin or PM updates it with a new configuration
- **THEN** the backend replaces the stored configuration
- **AND** the update timestamp advances

#### Scenario: Preset is renamed
- **GIVEN** a preset exists in a workspace
- **WHEN** an authenticated admin or PM updates its name to a name not already used in that workspace
- **THEN** the backend stores the new name

#### Scenario: Renaming onto an existing name is rejected
- **GIVEN** two presets exist in a workspace
- **WHEN** an admin or PM renames one to the other's name
- **THEN** the backend rejects the request as a conflict

#### Scenario: A PM can edit a preset created by an admin
- **GIVEN** a preset created by an admin exists in a workspace
- **WHEN** a PM of that workspace updates or deletes it
- **THEN** the backend applies the change

#### Scenario: Preset is deleted
- **GIVEN** a preset exists in a workspace
- **WHEN** an authenticated admin or PM deletes it
- **THEN** the backend removes it
- **AND** listing presets no longer returns it

#### Scenario: Updating a preset from another workspace is rejected
- **GIVEN** a preset exists in one workspace
- **WHEN** an admin of a different workspace attempts to update or delete it
- **THEN** the backend responds as not found
- **AND** the preset is unchanged

### Requirement: Report Presets Follow Reports Authorization

The preset endpoints MUST enforce the same role authorization as the time-report endpoints: admins and PMs may read and write presets, and members MUST NOT. A preset MUST store filter selections only and MUST NOT grant access to report data outside the requesting user's own report scope.

#### Scenario: Member cannot read presets
- **GIVEN** an authenticated member of a workspace
- **WHEN** the member requests the preset list
- **THEN** the backend responds with 403 Forbidden

#### Scenario: Member cannot write presets
- **GIVEN** an authenticated member of a workspace
- **WHEN** the member attempts to create, update, or delete a preset
- **THEN** the backend responds with 403 Forbidden

#### Scenario: Opening a preset does not widen PM report scope
- **GIVEN** a preset scoped to a project outside a PM's report scope
- **WHEN** that PM opens the preset and runs the report
- **THEN** the report returns only data within the PM's existing report scope
- **AND** the backend continues to enforce scope on rows and export
