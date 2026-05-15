## MODIFIED Requirements

### Requirement: User-Web Route Inventory

The user-web app SHALL expose a public login route and authenticated member routes for the documented user pages.

#### Scenario: User-web route map includes login and authenticated entry points

- **WHEN** the router is initialized
- **THEN** it includes a public login route
- **AND** it includes authenticated routes for dashboard, time entries, Projects list, and profile
- **AND** the Projects page is reached at `/projects`
- **AND** it does not include the placeholder authenticated `projects/:projectId` route
- **AND** it does not include a dedicated authenticated timer route

### Requirement: Authenticated Shell Ownership

Authenticated user pages MUST render within the shared app shell layout.

#### Scenario: Protected page renders inside the shell

- **WHEN** an authenticated user navigates to dashboard, time entries, Projects list, or profile
- **THEN** the selected page renders inside the shared authenticated shell
- **AND** the shell provides the documented top bar, sidebar navigation, and main-content container structure
- **AND** timer start, stop, and task switching are available from the shell top bar rather than a dedicated Timer route
