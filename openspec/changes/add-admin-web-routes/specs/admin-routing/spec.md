## ADDED Requirements

### Requirement: Admin Route Inventory

The `admin-web` SPA MUST define a stable route inventory for the documented admin-facing pages so future page work can mount without route ambiguity.

#### Scenario: Admin page routes are defined

- **WHEN** the admin-web router is configured
- **THEN** it includes route entries for dashboard, reports, invoices, members, projects, and settings
- **AND** each route maps to the admin-web page set described in the project UI requirements

#### Scenario: Route map stays aligned with project docs

- **WHEN** the admin-web route inventory is implemented or updated
- **THEN** the route structure remains aligned with the relevant project docs and change design
- **AND** the docs are treated as the source of truth for the expected admin page inventory and shell behavior

### Requirement: Auth-Aware Admin Entry Structure

The `admin-web` SPA MUST separate guest-only entry from authenticated application routes so admin navigation aligns with the shared web auth direction.

#### Scenario: Guest entry route exists

- **WHEN** an unauthenticated user enters the admin SPA
- **THEN** the router provides a guest-only login entry route
- **AND** authenticated admin pages are not mounted as public routes

#### Scenario: Authenticated admin routes are grouped

- **WHEN** the admin-web router defines authenticated application routes
- **THEN** the protected routes are mounted under the shared admin shell structure
- **AND** the dashboard, reports, invoices, members, projects, and settings pages resolve within that authenticated shell

### Requirement: Protected Admin Navigation Behavior

The `admin-web` router MUST treat the documented admin pages as authenticated destinations.

#### Scenario: Anonymous user requests a protected admin page

- **WHEN** an anonymous session navigates to a protected admin-web route
- **THEN** the router redirects the user to the guest login entry
- **AND** the requested destination is preserved for later authenticated navigation

#### Scenario: Authenticated user requests the guest login route

- **WHEN** an authenticated session navigates to the admin-web login route
- **THEN** the router redirects the user to the default authenticated admin destination
- **AND** the router may resume a preserved redirect target when one is valid
