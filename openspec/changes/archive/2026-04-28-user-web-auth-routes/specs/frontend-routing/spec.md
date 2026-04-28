## ADDED Requirements

### Requirement: User-Web Route Inventory

The user-web app SHALL expose a public login route and authenticated member routes for the documented user pages.

#### Scenario: User-web route map includes login and authenticated entry points

- **WHEN** the router is initialized
- **THEN** it includes a public login route
- **AND** it includes authenticated routes for dashboard, timer, time entries, project view, and profile

### Requirement: Protected Route Enforcement

The user-web router MUST prevent anonymous access to protected routes.

#### Scenario: Anonymous user requests a protected route

- **WHEN** an anonymous browser session navigates to a protected user-web route
- **THEN** the router redirects the user to the login route
- **AND** the originally requested destination is retained for post-login continuation

### Requirement: Guest-Only Login Route

The user-web router MUST keep authenticated users out of the login route.

#### Scenario: Authenticated user requests the login route

- **WHEN** an authenticated browser session navigates to the login route
- **THEN** the router redirects the user to the default authenticated entry route

### Requirement: Authenticated Shell Ownership

Authenticated user pages MUST render within the shared app shell layout.

#### Scenario: Protected page renders inside the shell

- **WHEN** an authenticated user navigates to dashboard, timer, time entries, project view, or profile
- **THEN** the selected page renders inside the shared authenticated shell
- **AND** the shell provides the documented top bar, sidebar navigation, and main-content container structure
