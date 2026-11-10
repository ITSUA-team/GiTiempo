# Spec Delta

## MODIFIED Requirements

### Requirement: Admin Route Inventory

The `admin-web` SPA MUST define a stable route inventory for the documented admin-facing pages so future page work can mount without route ambiguity.

#### Scenario: Admin page routes are defined

- **WHEN** the admin-web router is configured
- **THEN** it includes route entries for dashboard, reports, invoices, invoice detail (`/invoices/:id`), members, projects, and settings
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
- **AND** dashboard, reports, invoices, invoice detail, members, projects, add-project, settings, 403, and 404 route views are configured as lazy route components that resolve only when their route is visited

#### Scenario: Admin lazy routes preserve navigation behavior

- **WHEN** navigation targets an admin-web lazy route after auth bootstrap allows the route
- **THEN** the router resolves the lazy route component and completes navigation to the same route name, path, and metadata defined by the existing route inventory
- **AND** guest-only login redirects, protected-route redirects, authenticated admin shell ownership, standalone 403/404 behavior, and valid preserved redirect handling remain unchanged

### Requirement: Role-Scoped Admin Route Access

The `admin-web` router and authenticated shell MUST keep role restrictions consistent so users cannot navigate to product areas their current workspace role cannot use, including immediately after an authenticated workspace switch changes the selected role.

#### Scenario: Product route role matrix is explicit

- **WHEN** the admin-web router defines role-restricted product routes
- **THEN** Dashboard, Reports, Invoices, and Invoice Detail allow workspace roles `admin` and `pm`
- **AND** Members, Projects, Add Project, and Settings allow only workspace role `admin`
- **AND** route-level `/403` and authenticated not-found routes remain authenticated standalone routes without product-page role restrictions

#### Scenario: Admin users can reach all admin product routes

- **WHEN** an authenticated admin navigates through the admin-web product routes
- **THEN** dashboard, reports, invoices, invoice detail, members, projects, add-project, and settings routes are available
- **AND** the shell navigation exposes the product routes intended for admin users

#### Scenario: Admin opens admin-only pages

- **WHEN** an authenticated user with workspace role `admin` navigates to an admin-web product route that allows only admin users
- **THEN** the router allows the navigation after auth bootstrap completes
- **AND** the requested admin product page renders through the authenticated admin route tree

#### Scenario: PM users only see PM-safe admin routes

- **WHEN** an authenticated PM uses admin-web
- **THEN** the dashboard, reports, invoices, and invoice detail routes are available
- **AND** members, projects, add-project, and settings are denied until their PM-safe UI behavior is implemented
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

#### Scenario: Admin-web switch to non-admin workspace redirects to user-web

- **GIVEN** an authenticated `admin-web` session switches to a workspace where the selected role cannot access admin routes
- **WHEN** the switch succeeds and the selected workspace session becomes active
- **THEN** `admin-web` redirects the user to the accessible `user-web` dashboard for that selected workspace context
- **AND** `admin-web` does not resume the previously denied admin product route

#### Scenario: Admin-web switch keeps user in admin-web only while the route stays allowed

- **GIVEN** an authenticated `admin-web` session switches to a workspace where the selected role can still access admin routes
- **WHEN** the switch succeeds and the current admin route remains allowed for that selected role
- **THEN** the user remains in `admin-web`
- **AND** the authenticated route tree continues with the selected workspace context
- **WHEN** the current admin route is not allowed for that selected role
- **THEN** `admin-web` falls back to its default authenticated dashboard instead of keeping the denied route mounted