## MODIFIED Requirements

### Requirement: Administrative Management Pages

The members, projects, and settings pages MUST support the documented administrative management flows. Manual project creation MUST use a dedicated route rather than a dialog.

#### Scenario: Members management view

- **GIVEN** an admin opens the members page
- **WHEN** the page renders
- **THEN** it shows member identity, role, project assignment context, and actions

#### Scenario: Workspace settings view

- **GIVEN** an admin opens the settings page
- **WHEN** the page renders
- **THEN** workspace settings are shown in a grouped single-column form layout
- **AND** save actions remain discoverable at section level or page bottom

#### Scenario: Add Project page uses dedicated route

- **GIVEN** an admin clicks "New Project" on the projects list page
- **WHEN** navigation occurs
- **THEN** the admin is taken to the dedicated Add Project route
- **AND** the page renders as a single-column form card with no side panel

#### Scenario: Add Project form card matches design padding

- **WHEN** the Add Project form renders
- **THEN** the form card uses `p-5` padding (20px) matching the approved design
- **AND** all form field labels render at `text-[12px] font-medium` (sentence-case, no uppercase tracking)
