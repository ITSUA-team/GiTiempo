## MODIFIED Requirements

### Requirement: Admin Projects List Page

The admin projects page MUST render pixel-perfect to the approved Pencil design (node `6iAjf`).

#### Scenario: Page header renders correctly

- **GIVEN** an authenticated admin opens the projects page
- **WHEN** the page loads
- **THEN** the page header shows "Projects" as an `h1` with subtitle text on the left
- **AND** a "New Project" button is on the right

#### Scenario: Stat cards show active-only counts

- **WHEN** the data loads
- **THEN** three stat cards are shown: Active Projects, Private, Public
- **AND** Private and Public counts only include active projects
- **AND** each card is `h-24` (96px) to match the design stat row height

#### Scenario: Projects table renders all projects

- **WHEN** the table loads
- **THEN** all projects (active and archived) are shown
- **AND** archived projects show a muted name, "Archived" badge, and Edit + Unarchive actions
- **AND** active projects show normal name, visibility badge, and Edit + Archive actions

#### Scenario: MultiSelect shows member names with email fallback

- **WHEN** the inline edit row is open
- **THEN** the members MultiSelect shows each member's display name
- **AND** members with no display name show their email instead

#### Scenario: Unarchive button uses brand colour

- **GIVEN** an archived project row
- **WHEN** rendered
- **THEN** the Unarchive button uses `text-brand` colour (not destructive red)

### Requirement: Add Project Page

The add project page MUST render as a single-column form card matching the approved Pencil design, with no two-column info panel layout.

#### Scenario: Form renders in single-column card

- **GIVEN** an admin navigates to the Add Project page
- **WHEN** the page renders
- **THEN** a single `bg-surface` card is shown containing the form
- **AND** no right-side info panel is rendered

#### Scenario: Form labels use correct typography

- **WHEN** the form renders
- **THEN** all field labels use `text-[12px] font-medium` (sentence-case, no uppercase tracking)

#### Scenario: Form submission creates project

- **GIVEN** the admin enters a project name and selects visibility
- **WHEN** they click Create
- **THEN** `POST /projects` is called with the form values
- **AND** on success the user is redirected to the projects list
