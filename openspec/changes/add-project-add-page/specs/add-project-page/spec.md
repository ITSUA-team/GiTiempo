## ADDED Requirements

### Requirement: Add Project Route Renders Real Form

The admin-web app MUST render a functional Add Project page at `/projects/new` inside the authenticated shell.

#### Scenario: Add Project page loads with correct layout

- **WHEN** an authenticated admin user navigates to `/projects/new`
- **THEN** the Add Project page renders inside the authenticated shell
- **AND** the page shows a "← Back to projects" link above the heading
- **AND** the page shows an "Add Project" heading with description copy
- **AND** the page shows the Add Project form card on the left and the Project Source sidebar card on the right

#### Scenario: Add Project route redirects unauthenticated users to login

- **WHEN** an unauthenticated user navigates to `/projects/new`
- **THEN** the app redirects to the admin login page

### Requirement: Add Project Form Collects Required Fields

The Add Project form MUST render the correct fields and block invalid submissions.

#### Scenario: Form renders with correct fields

- **WHEN** the Add Project page loads
- **THEN** the form shows a "Project name" text input
- **AND** the form shows a read-only "Source" field displaying "Manual"
- **AND** the form shows a read-only "Project manager" field displaying the current user's display name
- **AND** the form shows a "Visibility" selector with options "Public" and "Private"
- **AND** the form shows a "Create project" primary submit button and a "Back" secondary button

#### Scenario: Form blocks submit when project name is empty

- **WHEN** the user submits the form with an empty project name
- **THEN** the form shows an inline validation error on the project name field
- **AND** no API request is made

#### Scenario: Form shows loading state during submission

- **WHEN** the user submits a valid form
- **THEN** the submit button shows a loading indicator and is disabled
- **AND** the Back button is disabled
- **AND** no second submit can be triggered while the request is in flight

#### Scenario: Successful project creation navigates to projects list

- **GIVEN** the form has valid data
- **WHEN** the API responds with a successful creation
- **THEN** the user is navigated to the Projects list page
- **AND** a success toast notification is shown

#### Scenario: Failed project creation shows inline error

- **GIVEN** the form has valid data
- **WHEN** the API responds with an error
- **THEN** an inline error message is shown below the form actions
- **AND** the form fields remain editable and the submit button is re-enabled

### Requirement: Project Source Card Is Informational Only

The Project Source sidebar card MUST render two option tiles explaining manual and workspace-import sources, with no interactive behavior.

#### Scenario: Source card renders both option tiles

- **WHEN** the Add Project page loads
- **THEN** the card shows a "Manual project" tile with a highlighted (selected) visual style
- **AND** the card shows a "Workspace import" tile with a default (unselected) visual style
- **AND** neither tile triggers any action when clicked
