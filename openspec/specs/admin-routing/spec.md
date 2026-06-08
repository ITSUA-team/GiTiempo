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

### Requirement: Admin Route Views Load On Demand

The admin-web router SHALL load route view components other than the primary public login entry and authenticated admin shell on demand.

#### Scenario: Admin non-login route views are lazy

- **WHEN** the admin-web router module is initialized
- **THEN** the public login route is available without a lazy route component loader
- **AND** the authenticated admin shell route is available without a lazy route component loader
- **AND** dashboard, reports, invoices, members, projects, add-project, settings, 403, and 404 route views are configured as lazy route components that resolve only when their route is visited

#### Scenario: Admin lazy routes preserve navigation behavior

- **WHEN** navigation targets an admin-web lazy route after auth bootstrap allows the route
- **THEN** the router resolves the lazy route component and completes navigation to the same route name, path, and metadata defined by the existing route inventory
- **AND** guest-only login redirects, protected-route redirects, authenticated admin shell ownership, standalone 403/404 behavior, and valid preserved redirect handling remain unchanged

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

### Requirement: Role-Scoped Admin Route Access

The `admin-web` router and authenticated shell MUST keep role restrictions consistent so users cannot navigate to product areas their current workspace role cannot use.

#### Scenario: Product route role matrix is explicit

- **WHEN** the admin-web router defines role-restricted product routes
- **THEN** Dashboard and Reports allow workspace roles `admin` and `pm`
- **AND** Invoices, Members, Projects, Add Project, and Settings allow only workspace role `admin`
- **AND** route-level `/403` and authenticated not-found routes remain authenticated standalone routes without product-page role restrictions

#### Scenario: Admin users can reach all admin product routes

- **WHEN** an authenticated admin navigates through the admin-web product routes
- **THEN** dashboard, reports, invoices, members, projects, add-project, and settings routes are available
- **AND** the shell navigation exposes the product routes intended for admin users

#### Scenario: Admin opens admin-only pages

- **WHEN** an authenticated user with workspace role `admin` navigates to an admin-web product route that allows only admin users
- **THEN** the router allows the navigation after auth bootstrap completes
- **AND** the requested admin product page renders through the authenticated admin route tree

#### Scenario: PM users only see PM-safe admin routes

- **WHEN** an authenticated PM uses admin-web
- **THEN** the dashboard and reports routes are available
- **AND** members, projects, add-project, invoices, and settings are denied until their PM-safe UI behavior is implemented
- **AND** denied product routes redirect to the standalone 403 route
- **AND** denied product routes are omitted from the authenticated shell navigation

#### Scenario: PM opens PM-allowed admin pages

- **WHEN** an authenticated user with workspace role `pm` navigates to an admin-web product route that allows admin and PM users
- **THEN** the router allows the navigation after auth bootstrap completes
- **AND** the page renders through the authenticated admin route tree

#### Scenario: PM is denied admin-only pages

- **WHEN** an authenticated user with workspace role `pm` navigates to an admin-web product route that allows only admin users
- **THEN** the router redirects the user to the standalone `/403` route
- **AND** the admin-only product page does not mount inside the authenticated admin shell

#### Scenario: Member users are denied admin product routes

- **WHEN** an authenticated member navigates to an admin-web product route
- **THEN** the router redirects to the standalone 403 route
- **AND** the 403 route itself does not redirect back to another protected product route

#### Scenario: Member is denied access to the admin shell entry

- **WHEN** an authenticated user with workspace role `member` navigates to an authenticated admin-web product route that is limited to admin or PM users
- **THEN** the router redirects the user to the standalone `/403` route
- **AND** the restricted product route does not mount inside the authenticated admin shell

#### Scenario: Missing role is denied as an authorization failure

- **WHEN** an authenticated admin-web session has completed bootstrap but the current profile role is null or unavailable
- **AND** the user navigates to a role-restricted admin-web product route
- **THEN** the router redirects the user to the standalone `/403` route
- **AND** the router does not treat the session as anonymous or redirect the user to the guest login entry

#### Scenario: Anonymous role checks preserve login behavior

- **WHEN** an anonymous browser session navigates to a role-restricted admin-web product route
- **THEN** the router redirects the user to the guest login entry
- **AND** the requested destination is preserved for later authenticated navigation instead of redirecting to `/403`

#### Scenario: Standalone error routes remain reachable

- **WHEN** an authenticated user with any workspace role navigates to the admin-web `/403` or authenticated not-found route
- **THEN** the router allows the standalone error route after auth bootstrap completes
- **AND** it does not apply product-page role restrictions to the error route itself

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
