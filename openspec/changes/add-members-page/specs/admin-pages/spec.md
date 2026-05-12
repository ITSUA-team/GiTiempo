## MODIFIED Requirements

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- **GIVEN** an admin opens the members page
- **WHEN** the page renders
- **THEN** the page shows a stats header with title, description, and a primary `Invite Member` action
- **AND** the page shows three stat cards covering Active Members, Pending Invites, and PMs Assigned
- **AND** the page shows a members table with columns covering member identity, role, project assignment count, last activity, and actions
- **AND** the page exposes inline PM assignment only for non-admin member rows
- **AND** the page exposes inline edit and confirmed removal flows through the members table action column

#### Scenario: Workspace settings view

- **GIVEN** an admin opens the settings page
- **WHEN** the page renders
- **THEN** workspace settings are shown in a grouped single-column form layout
- **AND** save actions remain discoverable at section level or page bottom
