## Purpose

Define current workspace read and administration behavior for workspace identity, settings, and seeded workspace foundation.

## Requirements

### Requirement: Current Workspace Read
The system SHALL provide an authenticated current-workspace endpoint for the single-tenant MVP.

#### Scenario: Authenticated member reads current workspace
- **GIVEN** the requester has a valid access token and an active workspace membership
- **WHEN** the requester asks for the current workspace
- **THEN** the system returns the seeded workspace identity and public workspace fields for that membership context

### Requirement: Workspace Settings Administration
The system MUST expose workspace settings to admins and restrict workspace-setting changes to admins. Workspace settings MUST include billing defaults and a workspace time zone used for calendar-period interpretation.

#### Scenario: Admin reads workspace settings
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester asks for workspace settings
- **THEN** the system returns the workspace settings for that workspace
- **AND** the settings include `currency`, `defaultHourlyRate`, and `timeZone`

#### Scenario: Admin updates workspace settings
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid workspace-settings update
- **THEN** the system persists the new settings values and returns the updated settings

#### Scenario: Admin updates workspace time zone
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid IANA time-zone identifier in the workspace-settings update
- **THEN** the system persists the time-zone value and returns it in the updated settings

#### Scenario: Non-admin attempts to manage workspace settings
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to read or update workspace settings
- **THEN** the system rejects the request as forbidden

### Requirement: Workspace Identity Administration
The system MUST allow admins to update mutable workspace identity fields and prevent non-admin updates.

#### Scenario: Admin updates workspace name
- **GIVEN** the requester is an admin member of the current workspace
- **WHEN** the requester submits a valid workspace identity update
- **THEN** the system persists the updated workspace fields and returns the updated workspace

#### Scenario: Non-admin attempts to update workspace identity
- **GIVEN** the requester is authenticated but is not an admin member of the current workspace
- **WHEN** the requester attempts to update workspace identity
- **THEN** the system rejects the request as forbidden

### Requirement: Seeded Default Workspace Foundation
The system SHALL create the default workspace foundation during seed/bootstrap for the single-tenant MVP.

#### Scenario: Seed creates workspace and settings
- **GIVEN** the application is initialized in an empty environment
- **WHEN** seed data is applied
- **THEN** the system creates the default workspace and its workspace settings record
- **AND** the workspace settings use `UTC` as the default time zone
