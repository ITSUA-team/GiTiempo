## MODIFIED Requirements

### Requirement: Admin Projects Page Renders Filterable Projects Table
The admin Projects page MUST display all workspace projects in a searchable, column-filterable management table.

#### Scenario: Table loads projects on mount
- **WHEN** the admin opens the Projects page
- **THEN** the page fetches `GET /projects`
- **AND** it fetches `GET /workspace-members` for assigned-member filter options
- **AND** the table shows Project, Source, Assigned members, Hours, Visibility, and Actions columns
- **AND** active projects appear before archived projects
- **AND** the table card header exposes a global search control with placeholder `Search projects`

#### Scenario: Projects member filters require loaded workspace member data
- **GIVEN** project data has loaded
- **AND** workspace member data is still loading
- **WHEN** the Projects page is still completing its initial load
- **THEN** the page keeps the initial loading surface instead of rendering the Projects table with empty assigned-member filter options
- **AND** if workspace member data fails during initial load, the page renders the retryable Projects request-error surface
- **AND** the table does not imply that no workspace members are available only because workspace member data is unavailable

#### Scenario: Project discovery filters narrow visible rows
- **WHEN** the admin enters global search text or selects Project, Source, Assigned members, Hours, or Visibility filters
- **THEN** visible project rows and mobile cards are limited to loaded projects matching all active filters
- **AND** global search matches project name, source label, assigned member names or emails or count, total hours, visibility label, and archived row status when rendered
- **AND** assigned-member filter options come from `GET /workspace-members`
- **AND** assigned-member row matching uses loaded project member assignments
- **AND** hours filter options are `Any`, `Tracked`, `40h+`, and `No hours`
- **AND** `Tracked` matches loaded rows with `totalHours > 0`
- **AND** `40h+` matches loaded rows with `totalHours >= 40`
- **AND** `No hours` matches loaded rows with `totalHours === 0`
- **AND** clearing active filters restores all loaded projects allowed by the page's role scope
- **AND** filtering does not require a projects API request solely for table discovery

#### Scenario: Projects filters follow approved table layout
- **WHEN** the Projects table renders on desktop
- **THEN** it shows a filter row directly below the column header with controls for Project, Source, Assigned members, Hours, and Visibility
- **AND** the Actions column does not render a filter control
- **AND** the mobile card list exposes equivalent search and filter controls above the cards
