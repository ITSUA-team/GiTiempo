## MODIFIED Requirements

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows.

#### Scenario: Members management view

- GIVEN an admin opens the members page
- WHEN the page renders
- THEN it shows member identity, role, project assignment context, and actions

#### Scenario: Workspace settings view

- GIVEN an admin opens the settings page
- WHEN the page renders
- THEN workspace settings are shown in a grouped single-column form layout using the current API-supported workspace settings fields
- AND save actions remain discoverable at the page bottom
- AND the page uses the approved Settings design as the visual reference without adding unsupported backend fields
