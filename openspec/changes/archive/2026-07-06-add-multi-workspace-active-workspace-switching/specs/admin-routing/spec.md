## MODIFIED Requirements

### Requirement: Role-Scoped Admin Route Access

The `admin-web` router and authenticated shell MUST keep role restrictions consistent so users cannot navigate to product areas their current workspace role cannot use, including immediately after an authenticated workspace switch changes the selected role.

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
