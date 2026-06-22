## ADDED Requirements

### Requirement: Role-Based Admin Route Authorization

The `admin-web` router MUST enforce role requirements for authenticated product routes before mounting route components whose required role set does not include the current user's workspace role.

#### Scenario: Product route role matrix is explicit

- **WHEN** the admin-web router defines role-restricted product routes
- **THEN** Dashboard, Reports, and Invoices allow workspace roles `admin` and `pm`
- **AND** Members, Projects, Add Project, and Settings allow only workspace role `admin`
- **AND** route-level `/403` and authenticated not-found routes remain authenticated standalone routes without product-page role restrictions

#### Scenario: Member is denied access to the admin shell entry

- **WHEN** an authenticated user with workspace role `member` navigates to an authenticated admin-web product route that is limited to admin or PM users
- **THEN** the router redirects the user to the standalone `/403` route
- **AND** the restricted product route does not mount inside the authenticated admin shell

#### Scenario: Missing role is denied as an authorization failure

- **WHEN** an authenticated admin-web session has completed bootstrap but the current profile role is null or unavailable
- **AND** the user navigates to a role-restricted admin-web product route
- **THEN** the router redirects the user to the standalone `/403` route
- **AND** the router does not treat the session as anonymous or redirect the user to the guest login entry

#### Scenario: PM opens PM-allowed admin pages

- **WHEN** an authenticated user with workspace role `pm` navigates to an admin-web product route that allows admin and PM users
- **THEN** the router allows the navigation after auth bootstrap completes
- **AND** the page renders through the authenticated admin route tree

#### Scenario: PM is denied admin-only pages

- **WHEN** an authenticated user with workspace role `pm` navigates to an admin-web product route that allows only admin users
- **THEN** the router redirects the user to the standalone `/403` route
- **AND** the admin-only product page does not mount inside the authenticated admin shell

#### Scenario: Admin opens admin-only pages

- **WHEN** an authenticated user with workspace role `admin` navigates to an admin-web product route that allows only admin users
- **THEN** the router allows the navigation after auth bootstrap completes
- **AND** the requested admin product page renders through the authenticated admin route tree

#### Scenario: Anonymous role checks preserve login behavior

- **WHEN** an anonymous browser session navigates to a role-restricted admin-web product route
- **THEN** the router redirects the user to the guest login entry
- **AND** the requested destination is preserved for later authenticated navigation instead of redirecting to `/403`

#### Scenario: Standalone error routes remain reachable

- **WHEN** an authenticated user with any workspace role navigates to the admin-web `/403` or authenticated not-found route
- **THEN** the router allows the standalone error route after auth bootstrap completes
- **AND** it does not apply product-page role restrictions to the error route itself
