# Frontend Admin Routing Specification

## Purpose

Define `admin-web` routing behavior for admin page inventory, auth-aware entry structure, protected navigation, and cross-SPA switching entry points.

## Requirements

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

#### Scenario: Normal authenticated admin pages are grouped

- **WHEN** the admin-web router defines authenticated product routes for dashboard, reports, invoices, members, projects, and settings
- **THEN** those protected routes are mounted under the shared admin shell structure
- **AND** the guest-only login route remains outside that authenticated shell

#### Scenario: Authenticated admin error routes stay standalone

- **WHEN** the admin-web router defines route-level 403 and 404 pages
- **THEN** those protected routes may render outside the shared admin shell structure
- **AND** they remain authenticated admin routes rather than guest entry pages

### Requirement: Protected Admin Navigation Behavior

The `admin-web` router MUST treat the documented admin pages as authenticated destinations.

#### Scenario: Anonymous user requests a protected admin page

- **WHEN** a browser session navigates to a protected admin-web route
- **THEN** the router waits for admin auth bootstrap to normalize the session before treating the navigation result as final
- **AND** if the normalized session is anonymous the router redirects the user to the guest login entry
- **AND** the requested destination is preserved for later authenticated navigation

#### Scenario: Authenticated user requests the guest login route

- **WHEN** an authenticated session navigates to the admin-web login route after auth bootstrap completes
- **THEN** the router redirects the user to the default authenticated admin destination
- **AND** the router may resume a preserved redirect target when one is valid

#### Scenario: Invalid redirect target falls back safely

- **WHEN** an authenticated session reaches the admin-web login route with a redirect query that is missing, malformed, or points outside the SPA
- **THEN** the router ignores that redirect value
- **AND** the router redirects the user to the default authenticated admin destination

### Requirement: Cross-SPA Switching Entry Points

The web products MUST provide visible entry points between `user-web` and `admin-web` so users can switch workspaces from the application chrome or login experience. Those entry points MUST resolve their counterpart destination from the frontend's documented counterpart-app configuration instead of relying on duplicated inline localhost port literals in multiple app surfaces.

#### Scenario: Authenticated user switches workspaces

- **WHEN** an authenticated user is inside either SPA shell
- **THEN** the shell exposes a visible link to the counterpart workspace
- **AND** the switch entry is placed in the shared identity or top-bar area rather than hidden inside page-specific content
- **AND** the counterpart destination is derived from the frontend's configured counterpart workspace URL strategy

#### Scenario: Guest user finds the counterpart workspace

- **WHEN** a guest user is on a login or auth-entry surface
- **THEN** the experience exposes a visible link to the counterpart workspace
- **AND** the cross-link does not replace the primary login action for the current SPA
- **AND** the counterpart destination is derived from the frontend's configured counterpart workspace URL strategy

#### Scenario: Frontend workspace links stay aligned across apps

- **WHEN** either SPA updates its counterpart workspace URL configuration for local or deployed environments
- **THEN** the shell and login cross-links for that SPA use the same documented source of truth
- **AND** the implementation does not require duplicated inline localhost port values across multiple app views or layouts
