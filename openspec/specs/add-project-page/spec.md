# Add Project Page Specification

## Purpose

Define the authenticated admin Add Project page behavior in `admin-web`.

## Requirements

### Requirement: Add Project Route Renders Real Form

The admin-web app MUST render a functional Add Project page at `/projects/new` inside the authenticated shell.

#### Scenario: Add Project page loads with correct layout

- **WHEN** an authenticated admin user navigates to `/projects/new`
- **THEN** the Add Project page renders inside the authenticated shell
- **AND** it shows a Back to projects link, heading, description copy, the Add Project form card, and the Project Source sidebar card

#### Scenario: Add Project route redirects unauthenticated users to login

- **WHEN** an unauthenticated user navigates to `/projects/new`
- **THEN** the app redirects to the admin login page

### Requirement: Add Project Form Collects Required Fields

The Add Project form MUST render the required fields and block invalid submissions.

#### Scenario: Form renders with correct fields

- **WHEN** the Add Project page loads
- **THEN** the form shows Project name, read-only Source `Manual`, read-only Project manager, and Visibility fields
- **AND** it shows Create project and Back actions

#### Scenario: Form handles validation and submission

- **WHEN** the user submits an empty project name
- **THEN** the form shows an inline validation error and sends no API request
- **AND** valid submission disables duplicate submission while the request is in flight
- **AND** successful creation navigates to the Projects list and shows a success toast
- **AND** failed creation shows an inline error while keeping the form editable

### Requirement: Project Source Card Is Informational Only

The Project Source sidebar card MUST explain manual and workspace-import sources without adding interactive source switching behavior.

#### Scenario: Source card renders both option tiles

- **WHEN** the Add Project page loads
- **THEN** the card shows Manual project as selected and Workspace import as unselected
- **AND** neither tile triggers an action when clicked
