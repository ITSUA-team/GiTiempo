## ADDED Requirements

### Requirement: Projects page displays summary stat cards
The page SHALL display three stat cards at the top showing Active Projects, Private, and Public counts sourced from `GET /projects/summary`.

#### Scenario: Stats load successfully
- **WHEN** the user navigates to the Projects page and the API responds successfully
- **THEN** three stat cards render with correct numeric values for Active Projects, Private, and Public

#### Scenario: Stats API fails
- **WHEN** the API call to `GET /projects/summary` returns an error
- **THEN** stat card values show `—` and a toast error message is displayed

---

### Requirement: Projects table lists all workspace projects
The page SHALL display a DataTable with columns: Project (name), Source, Assigned members (count), Hours, Visibility (badge), and Actions (Edit, Archive).

#### Scenario: Projects load successfully
- **WHEN** the page mounts and `GET /projects` responds successfully
- **THEN** each project row renders with correct name, source label, member count, hours, and visibility badge

#### Scenario: No projects exist
- **WHEN** `GET /projects` returns an empty array
- **THEN** the table shows a "No projects yet" empty state

#### Scenario: Projects load fails
- **WHEN** `GET /projects` returns an error
- **THEN** the table shows an error state and a toast is displayed

---

### Requirement: Assigned member filter narrows the table client-side
The page SHALL provide a `<Select>` above the table with options for each workspace member (label format: `Display Name (role)`). Selecting a member filters the table to show only projects that member is assigned to. Default option is "All members".

#### Scenario: Filter by member
- **WHEN** the user selects a member from the filter dropdown
- **THEN** the table rows update immediately to show only projects with that member in their assignments

#### Scenario: Clear filter
- **WHEN** the user selects "All members"
- **THEN** all projects are shown again

---

### Requirement: Inline row expansion for editing project settings
Clicking the Edit action on a row SHALL expand an inline panel below that row with a `<MultiSelect>` for assigned members and a `<Select>` for visibility, plus Cancel and Save buttons. Only one row can be expanded at a time.

#### Scenario: Expand settings panel
- **WHEN** the user clicks Edit on a project row
- **THEN** an inline settings panel opens below that row pre-populated with current members and visibility

#### Scenario: Opening a second row collapses the first
- **WHEN** a settings panel is already open and the user clicks Edit on a different row
- **THEN** the previous panel closes and the new one opens

#### Scenario: Save changes
- **WHEN** the user modifies members or visibility and clicks Save
- **THEN** `PATCH /projects/{id}` is called for visibility changes and assignment endpoints are called for member changes; on success the panel closes and the row updates

#### Scenario: Cancel discards changes
- **WHEN** the user clicks Cancel
- **THEN** the panel closes with no API calls and no state changes

---

### Requirement: Archive project
Clicking the Archive action SHALL call `PATCH /projects/{id}` with `{ isActive: false }` immediately. On success a toast confirms. On failure a toast shows the error.

#### Scenario: Archive succeeds
- **WHEN** the user clicks Archive on a project row and the API call succeeds
- **THEN** the project is removed from the active list and a success toast is shown

#### Scenario: Archive fails
- **WHEN** the API call returns an error
- **THEN** the row remains and an error toast is displayed

---

### Requirement: New Project dialog for manual project creation
Clicking "New Project" SHALL open a `<Dialog>` with a project name field and a visibility selector. Submitting calls `POST /projects`. On success the dialog closes and the project list refreshes.

#### Scenario: Create project successfully
- **WHEN** the user fills in a valid name and clicks Create
- **THEN** `POST /projects` is called, the dialog closes, and the new project appears in the table

#### Scenario: Empty name blocked
- **WHEN** the user submits with an empty name field
- **THEN** an inline validation error is shown and no API call is made

#### Scenario: API error on create
- **WHEN** `POST /projects` returns an error
- **THEN** the dialog stays open and an error toast is shown
