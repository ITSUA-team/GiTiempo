## MODIFIED Requirements

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- GIVEN an admin opens the members page
- WHEN the page renders
- THEN it shows a stats header with title, description, and a primary `Invite Member` action
- AND it shows stat cards covering active members, pending invites, and assigned PMs
- AND it shows a members table with member identity, role, project assignment count, last activity, and actions
- AND it exposes inline PM assignment only for non-admin member rows
- AND it exposes inline edit and confirmed removal flows through the members table action column

#### Scenario: Workspace settings view

- GIVEN an admin opens the settings page
- WHEN the page renders
- THEN workspace settings are shown in a grouped single-column form layout
- AND the form includes workspace name, currency, default hourly rate, and time zone fields
- AND the time zone field is an editable selector populated with valid IANA time-zone options and the current persisted time-zone value
- AND save actions remain discoverable at section level or page bottom

#### Scenario: Workspace settings time zone save

- GIVEN an admin changes the Settings page time zone to a valid IANA time-zone value
- WHEN the admin saves settings
- THEN the page submits the changed `timeZone` through the existing workspace settings update boundary
- AND the saved form reconciles from the authoritative workspace settings response
- AND unchanged workspace settings fields are not sent only to satisfy schemas

#### Scenario: Workspace settings time zone validation

- GIVEN an invalid time-zone value is represented in the Settings form state
- WHEN the admin attempts to save settings
- THEN the page shows field-level validation feedback for Time zone
- AND no workspace settings update request is sent
