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
- THEN workspace settings are shown in a grouped single-column form layout
- AND the form includes workspace name, currency, default hourly rate, and time zone fields
- AND save actions remain discoverable at section level or page bottom
